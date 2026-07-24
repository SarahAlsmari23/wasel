import { NextResponse } from 'next/server'
import { validateChatRequest } from '@/lib/ai/contracts'
import { AiProviderError, geminiProvider } from '@/lib/ai/gemini'
import { buildPrompt } from '@/lib/ai/prompts'
import { sanitizeComplaintContext, sanitizeHistory, sanitizeMessage } from '@/lib/ai/sanitize'
import { createClient } from '@/lib/supabase/server'
import type { ChatErrorResponse, ChatSuccessResponse } from '@/types/ai'

const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_WINDOW_MS = 60_000

// In-memory, per-process sliding-window limiter. Development-only: state
// resets on server restart and is not shared across multiple instances.
// Exists only to prevent accidental spam / unnecessary Gemini usage during
// this phase — not a production rate-limiting solution.
const requestTimestampsByUser = new Map<string, number[]>()

/**
 * Exported so its logic can be verified directly (called repeatedly with a
 * fake user id) without HTTP, auth, or any network call.
 */
export function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = requestTimestampsByUser.get(userId) ?? []
  const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestampsByUser.set(userId, recent)
    return false
  }

  recent.push(now)
  requestTimestampsByUser.set(userId, recent)
  return true
}

function errorResponse(error: string, status: number) {
  return NextResponse.json<ChatErrorResponse>({ error }, { status })
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

  if (!user) {
    return errorResponse('يجب تسجيل الدخول لاستخدام هذه الخدمة.', 401)
  }

  if (!checkRateLimit(user.id)) {
    return errorResponse('لقد تجاوزت الحد المسموح به من الطلبات. حاول مرة أخرى بعد قليل.', 429)
  }

  const validation = validateChatRequest(payload)
  if (!validation.valid) {
    return errorResponse(validation.error, 400)
  }

  const { message, history, intent, complaintContext } = validation.value

  const prompt = buildPrompt({
    sanitizedMessage: sanitizeMessage(message),
    sanitizedHistory: sanitizeHistory(history),
    intent,
    complaintContext: sanitizeComplaintContext(complaintContext),
    retrievedDocuments: [], // no RAG in this phase
  })

  try {
    const result = await geminiProvider.generate({ prompt })
    const response: ChatSuccessResponse = { ...result, sources: [] }
    return NextResponse.json<ChatSuccessResponse>(response, { status: 200 })
  } catch (error) {
    if (error instanceof AiProviderError) {
      return errorResponse('تعذر التواصل مع المساعد الذكي حالياً. حاول مرة أخرى لاحقاً.', 502)
    }
    return errorResponse('حدث خطأ غير متوقع. حاول مرة أخرى.', 500)
  }
}
