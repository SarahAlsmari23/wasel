import { NextResponse } from 'next/server'
import { validateChatRequest } from '@/lib/ai/contracts'
import { AiProviderError, cloudflareProvider } from '@/lib/ai/cloudflare'
import { buildPrompt } from '@/lib/ai/prompts'
import { sanitizeComplaintContext, sanitizeHistory, sanitizeMessage } from '@/lib/ai/sanitize'
import { retrieveRelevantDocuments, RetrievalError } from '@/lib/rag/retrieve'
import type { RetrievedDocument } from '@/lib/rag/types'
import { createClient } from '@/lib/supabase/server'
import type { ChatErrorResponse, ChatSource, ChatSuccessResponse } from '@/types/ai'

const RATE_LIMIT_WINDOW_MS = 60_000
// Guests get a tighter budget than signed-in users: the assistant is open to
// everyone (Phase 1 "Guest User"), so the anonymous path is the one exposed
// to casual abuse.
const RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED = 10
const RATE_LIMIT_MAX_REQUESTS_GUEST = 5

// In-memory, per-process sliding-window limiter. Development-only: state
// resets on server restart and is not shared across multiple instances.
// Exists only to prevent accidental spam / unnecessary AI-provider usage
// during this phase — not a production rate-limiting solution.
const requestTimestampsByUser = new Map<string, number[]>()

/**
 * Exported so its logic can be verified directly (called repeatedly with a
 * fake key) without HTTP, auth, or any network call.
 */
export function checkRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now()
  const timestamps = requestTimestampsByUser.get(key) ?? []
  const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= maxRequests) {
    requestTimestampsByUser.set(key, recent)
    return false
  }

  recent.push(now)
  requestTimestampsByUser.set(key, recent)
  return true
}

/**
 * Best-effort client identity for guest rate limiting. Proxy headers are
 * spoofable, so this only raises the cost of casual abuse — it is not an
 * authentication signal and is never used for anything but the limiter key.
 */
function getGuestRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  return `guest:${clientIp || 'unknown'}`
}

function errorResponse(error: string, status: number) {
  return NextResponse.json<ChatErrorResponse>({ error }, { status })
}

// TEMPORARY DIAGNOSTICS — structural only. Never logs secrets, prompts,
// embeddings, document content, raw provider/database errors, or stack
// traces. RetrievalError/AiProviderError messages are already generic,
// internal-only strings by design (defined in lib/rag/retrieve.ts and
// lib/ai/cloudflare.ts respectively) — safe to log as-is. Remove after this
// diagnostic pass.
function categorizeRetrievalFailure(error: unknown): string {
  if (error instanceof RetrievalError) return error.message
  return error instanceof Error ? error.name : typeof error
}

function categorizeGenerationFailure(error: unknown): string {
  if (error instanceof AiProviderError) return error.message
  return error instanceof Error ? error.name : typeof error
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse('الطلب غير صالح.', 400)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The assistant is open to guests by design — asking general questions
  // never requires an account. Only complaint creation and persistence are
  // gated, and neither happens here.
  const rateLimitKey = user ? user.id : getGuestRateLimitKey(request)
  const maxRequests = user ? RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED : RATE_LIMIT_MAX_REQUESTS_GUEST

  if (!checkRateLimit(rateLimitKey, maxRequests)) {
    return errorResponse('لقد تجاوزت الحد المسموح به من الطلبات. حاول مرة أخرى بعد قليل.', 429)
  }

  const validation = validateChatRequest(payload)
  if (!validation.valid) {
    return errorResponse(validation.error, 400)
  }

  const { message, history, intent, complaintContext } = validation.value
  const sanitizedMessage = sanitizeMessage(message)

  console.log(
    `[chat] SUPABASE_SERVICE_ROLE_KEY exists: ${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}`,
  )

  // Retrieval is non-fatal: a failure or timeout here must never surface to
  // the user or block the chat response — it just falls back to no
  // retrieved context, same as before RAG existed.
  console.log('[chat] retrieval-start')
  const retrievalStart = Date.now()
  let retrievedDocuments: RetrievedDocument[] = []
  try {
    retrievedDocuments = await retrieveRelevantDocuments(sanitizedMessage)
    console.log(
      `[chat] retrieval-success count=${retrievedDocuments.length} elapsedMs=${Date.now() - retrievalStart}`,
    )
  } catch (error) {
    retrievedDocuments = []
    console.log(
      `[chat] retrieval-fallback category=${categorizeRetrievalFailure(error)} elapsedMs=${Date.now() - retrievalStart}`,
    )
  }

  const prompt = buildPrompt({
    sanitizedMessage,
    sanitizedHistory: sanitizeHistory(history),
    intent,
    complaintContext: sanitizeComplaintContext(complaintContext),
    retrievedDocuments,
  })
  console.log(
    `[chat] prompt-built length=${prompt.length} retrievedDocumentCount=${retrievedDocuments.length}`,
  )

  console.log('[chat] generation-start')
  const generationStart = Date.now()
  try {
    const result = await cloudflareProvider.generate({ prompt })
    console.log(`[chat] generation-success elapsedMs=${Date.now() - generationStart}`)
    const sources: ChatSource[] = retrievedDocuments.slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.title,
      entityName: doc.entityName,
      officialUrl: doc.officialUrl,
      similarity: doc.similarity,
    }))
    const response: ChatSuccessResponse = { ...result, sources }
    return NextResponse.json<ChatSuccessResponse>(response, { status: 200 })
  } catch (error) {
    console.log(
      `[chat] generation-failed category=${categorizeGenerationFailure(error)} elapsedMs=${Date.now() - generationStart}`,
    )
    if (error instanceof AiProviderError) {
      return errorResponse('تعذر التواصل مع المساعد الذكي حالياً. حاول مرة أخرى لاحقاً.', 502)
    }
    return errorResponse('حدث خطأ غير متوقع. حاول مرة أخرى.', 500)
  }
}
