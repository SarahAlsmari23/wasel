import { isValidChatSuccessResponse } from '@/lib/ai/contracts'
import { buildAssistantAnswer, type AssistantAnswer } from '@/lib/wasal/mock-engine'
import type { ChatHistoryItem } from '@/types/ai'

const REQUEST_TIMEOUT_MS = 20_000

export type AssistantRequest = {
  conversationId: string
  message: string
  history: ChatHistoryItem[]
  signal?: AbortSignal
}

export type AssistantResult = AssistantAnswer & {
  /** True when the answer came from the mocked engine, not the AI provider. */
  isMocked: boolean
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
  message,
  history,
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
        message,
        history,
        intent: 'general_question',
      }),
      signal: combinedSignal,
    })

    const payload: unknown = await response.json().catch(() => null)

    if (response.ok && isValidChatSuccessResponse(payload)) {
      return {
        answer: payload.answer,
        suggestedEntityName: payload.suggestedEntity?.name,
        suggestedEntityReason: payload.suggestedEntity?.reason,
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
