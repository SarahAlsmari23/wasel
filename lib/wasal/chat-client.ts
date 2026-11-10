import { isValidChatSuccessResponse } from '@/lib/ai/contracts'
import type { Locale } from '@/lib/i18n/config'
import type { ChatComplaintContext, ChatHistoryItem, ChatIntent, ChatRouting } from '@/types/ai'

/**
 * Slightly longer than the route's own generation budget (primary Llama model
 * plus one fallback attempt), so the server — not the browser — decides when
 * a turn has timed out and can return a meaningful, localized error.
 */
const REQUEST_TIMEOUT_MS = 50_000

export type AssistantRequest = {
  conversationId: string
  /** Real server-created conversation id, when the caller has one — see
   * ChatRequest.dbConversationId in types/ai.ts. */
  dbConversationId?: string
  message: string
  history: ChatHistoryItem[]
  intent?: ChatIntent
  complaintContext?: ChatComplaintContext
  /** The authority already shown to the user this conversation, if any — lets
   * the server keep a follow-up question on the same authority instead of
   * re-routing on the follow-up's wording alone. Validated server-side. */
  activeEntityName?: string
  locale?: Locale
  signal?: AbortSignal
}

export type AssistantResult = {
  answer: string
  suggestedEntityName?: string
  suggestedEntityReason?: string
  routing?: ChatRouting | null
  missingFields?: string[]
  nextQuestion?: string | null
  nextFieldKey?: string | null
  readyToGenerateComplaint?: boolean
  routingPersisted?: boolean
  intent?: ChatIntent
}

export type AssistantFailureKind =
  'rate_limited' | 'unavailable' | 'timeout' | 'network' | 'invalid'

/**
 * Thrown whenever a genuine AI answer could not be obtained. There is
 * deliberately no canned/mock substitute: the UI shows an honest, localized
 * error and lets the user retry with their message preserved.
 */
export class AssistantRequestError extends Error {
  readonly kind: AssistantFailureKind
  /** Server-provided, already-localized message, when one was returned. */
  readonly serverMessage?: string

  constructor(kind: AssistantFailureKind, serverMessage?: string) {
    super(`Assistant request failed: ${kind}`)
    this.name = 'AssistantRequestError'
    this.kind = kind
    this.serverMessage = serverMessage
  }
}

function kindForStatus(status: number): AssistantFailureKind {
  if (status === 429) return 'rate_limited'
  if (status === 504) return 'timeout'
  if (status === 400) return 'invalid'
  return 'unavailable'
}

export async function requestAssistantAnswer({
  conversationId,
  dbConversationId,
  message,
  history,
  intent,
  complaintContext,
  activeEntityName,
  locale,
  signal,
}: AssistantRequest): Promise<AssistantResult> {
  const timeoutController = new AbortController()
  const timeout = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal

  let response: Response
  try {
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        dbConversationId,
        message,
        history,
        intent,
        complaintContext,
        activeEntityName,
        locale,
      }),
      signal: combinedSignal,
    })
  } catch (error) {
    // A caller-initiated abort is not a failure — let it propagate as-is.
    if (signal?.aborted) throw error
    window.clearTimeout(timeout)
    throw new AssistantRequestError(timeoutController.signal.aborted ? 'timeout' : 'network')
  }

  try {
    const payload: unknown = await response.json().catch(() => null)

    if (response.ok && isValidChatSuccessResponse(payload)) {
      return {
        answer: payload.answer,
        suggestedEntityName: payload.suggestedEntity?.name,
        suggestedEntityReason: payload.suggestedEntity?.reason,
        routing: payload.routing,
        missingFields: payload.missingFields,
        nextQuestion: payload.nextQuestion,
        nextFieldKey: payload.nextFieldKey,
        readyToGenerateComplaint: payload.readyToGenerateComplaint,
        routingPersisted: payload.routingPersisted,
        intent: payload.intent,
      }
    }

    const serverMessage =
      payload &&
      typeof payload === 'object' &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : undefined
    throw new AssistantRequestError(
      response.ok ? 'unavailable' : kindForStatus(response.status),
      serverMessage,
    )
  } finally {
    window.clearTimeout(timeout)
  }
}
