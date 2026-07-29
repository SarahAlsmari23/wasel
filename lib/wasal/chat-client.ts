import { isValidChatSuccessResponse } from '@/lib/ai/contracts'
import { buildAssistantAnswer, type AssistantAnswer } from '@/lib/wasal/mock-engine'
import type { ChatComplaintContext, ChatHistoryItem, ChatIntent, ChatRouting } from '@/types/ai'

const REQUEST_TIMEOUT_MS = 20_000

export type AssistantRequest = {
  conversationId: string
  /** Real server-created conversation id, when the caller has one — see
   * ChatRequest.dbConversationId in types/ai.ts. */
  dbConversationId?: string
  message: string
  history: ChatHistoryItem[]
  intent?: ChatIntent
  complaintContext?: ChatComplaintContext
  signal?: AbortSignal
}

export type AssistantResult = AssistantAnswer & {
  /** True when the answer came from the mocked engine, not the AI provider. */
  isMocked: boolean
  /** Present only for real (non-mocked) responses — see types/ai.ts. */
  routing?: ChatRouting | null
  missingFields?: string[]
  nextQuestion?: string | null
  nextFieldKey?: string | null
  readyToGenerateComplaint?: boolean
  routingPersisted?: boolean
  /** Server-authoritative final classification (Phase 7.1) — never the
   * client's own guess. Absent only for a mocked fallback response. */
  intent?: ChatIntent
}

/**
 * Asks the AI assistant. The real /api/ai/chat endpoint is preferred, but the
 * MVP must work without an AI provider configured — any failure (network,
 * provider outage, rate limit, unexpected shape) falls back to the local
 * mocked engine rather than surfacing an error to the user.
 *
 * A caller-initiated abort is re-thrown so an in-flight request can be
 * cancelled without producing a stray fallback reply.
 */
export async function requestAssistantAnswer({
  conversationId,
  dbConversationId,
  message,
  history,
  intent,
  complaintContext,
  signal,
}: AssistantRequest): Promise<AssistantResult> {
  const timeoutController = new AbortController()
  const timeout = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        dbConversationId,
        message,
        history,
        intent,
        complaintContext,
      }),
      signal: combinedSignal,
    })

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
        isMocked: false,
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error
  } finally {
    window.clearTimeout(timeout)
  }

  return { ...buildAssistantAnswer(message), isMocked: true }
}
