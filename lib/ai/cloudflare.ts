import type { AiGenerateInput, AiGenerateOutput, AiProvider } from '@/lib/ai/provider'

// @cf/zai-org/glm-4.7-flash was tried first, per the original migration
// request, but empirically failed: it's a reasoning model whose internal
// chain-of-thought overhead produced highly variable response times
// (measured 10.5s-45s+ across real test runs), timing out roughly two of
// every three real requests even at a 45s budget. Replaced with a model
// from Cloudflare's documented JSON-mode-supported list that responded
// consistently in 10-17s across three real test runs.
const GENERATION_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const EMBEDDING_MODEL_NAME = '@cf/google/embeddinggemma-300m'
const EMBEDDING_DIMENSION = 768

const GENERATE_TIMEOUT_MS = 45_000
const EMBED_TIMEOUT_MS = 10_000

const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 500
// 401/403/429 are never retried — retrying auth failures does nothing, and
// retrying rate limits would only compound pressure on the free allocation.
const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504])

/**
 * Wraps every Cloudflare Workers AI failure mode (missing credentials,
 * network, HTTP/auth error, timeout, malformed structured output). The
 * original error is never attached — only this generic, internal-only
 * message travels with it.
 */
export class AiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderError'
  }
}

// Standard (lowercase) JSON Schema types, per Cloudflare's documented
// response_format/json_schema shape — distinct from Gemini's uppercase
// Schema.Type enum this project used previously.
const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    intent: {
      type: 'string',
      enum: [
        'general_question',
        'entity_identification',
        'missing_information',
        'complaint_guidance',
        'draft_assistance',
      ],
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    grounded: { type: 'boolean' },
    missingFields: { type: 'array', items: { type: 'string' } },
    suggestedQuestions: { type: 'array', items: { type: 'string' } },
    suggestedEntity: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        reason: { type: 'string' },
      },
    },
    safetyNotice: { type: 'string' },
  },
  required: ['answer', 'intent', 'confidence', 'grounded', 'missingFields', 'suggestedQuestions'],
}

function isValidGenerateOutput(value: unknown): value is AiGenerateOutput {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.answer === 'string' &&
    typeof candidate.intent === 'string' &&
    typeof candidate.confidence === 'string' &&
    typeof candidate.grounded === 'boolean' &&
    Array.isArray(candidate.missingFields) &&
    Array.isArray(candidate.suggestedQuestions)
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getCredentials(): { accountId: string; apiToken: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    throw new AiProviderError('Cloudflare account credentials are not configured.')
  }
  return { accountId, apiToken }
}

// Shared retry orchestration: one overall deadline across every attempt and
// every retry delay (a retry never gets a fresh full timeout). Retries only
// on RETRYABLE_HTTP_STATUSES, up to MAX_ATTEMPTS total.
async function withRetry(
  performAttempt: (timeoutMs: number) => Promise<{ status: number; json: unknown }>,
  overallTimeoutMs: number,
): Promise<{ status: number; json: unknown }> {
  const overallDeadline = Date.now() + overallTimeoutMs
  let terminalError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remainingMs = overallDeadline - Date.now()
    if (remainingMs <= 0) {
      throw new AiProviderError('Request to the AI provider timed out.')
    }

    try {
      return await performAttempt(remainingMs)
    } catch (error) {
      const status = (error as { status?: unknown } | null)?.status
      const isRetryable = typeof status === 'number' && RETRYABLE_HTTP_STATUSES.has(status)
      const hasAttemptsLeft = attempt < MAX_ATTEMPTS

      if (!isRetryable || !hasAttemptsLeft) {
        terminalError = error
        break
      }

      const remainingBeforeDelay = overallDeadline - Date.now()
      if (remainingBeforeDelay <= 0) {
        throw new AiProviderError('Request to the AI provider timed out.')
      }
      await sleep(Math.min(RETRY_DELAY_MS, remainingBeforeDelay))
    }
  }

  throw terminalError
}

async function fetchChatCompletionOnce(
  accountId: string,
  apiToken: string,
  prompt: string,
  timeoutMs: number,
): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const httpResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model: GENERATION_MODEL_NAME,
          messages: [{ role: 'user', content: prompt }],
          response_format: {
            type: 'json_schema',
            json_schema: RESPONSE_JSON_SCHEMA,
          },
        }),
        signal: controller.signal,
      },
    )

    if (!httpResponse.ok) {
      // Status preserved on a plain Error (not AiProviderError) so the
      // retry logic above can bucket it. The response body is never read.
      const statusError = new Error('Cloudflare API returned a non-success status.') as Error & {
        status: number
      }
      statusError.status = httpResponse.status
      throw statusError
    }

    try {
      const json = await httpResponse.json()
      return { status: httpResponse.status, json }
    } catch {
      throw new AiProviderError('The AI provider returned a malformed response.')
    }
  } catch (networkError) {
    if (networkError instanceof Error && networkError.name === 'AbortError') {
      throw new AiProviderError('Request to the AI provider timed out.')
    }
    throw networkError
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchEmbeddingOnce(
  accountId: string,
  apiToken: string,
  text: string,
  timeoutMs: number,
): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const httpResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL_NAME,
          input: text,
        }),
        signal: controller.signal,
      },
    )

    if (!httpResponse.ok) {
      const statusError = new Error('Cloudflare API returned a non-success status.') as Error & {
        status: number
      }
      statusError.status = httpResponse.status
      throw statusError
    }

    try {
      const json = await httpResponse.json()
      return { status: httpResponse.status, json }
    } catch {
      throw new AiProviderError('The embedding provider returned an unexpected response shape.')
    }
  } catch (networkError) {
    if (networkError instanceof Error && networkError.name === 'AbortError') {
      throw new AiProviderError('Request to the AI provider timed out.')
    }
    throw networkError
  } finally {
    clearTimeout(timeoutId)
  }
}

export const cloudflareProvider: AiProvider = {
  async generate({ prompt }: AiGenerateInput): Promise<AiGenerateOutput> {
    try {
      const { accountId, apiToken } = getCredentials()

      const { json } = await withRetry(
        (timeoutMs) => fetchChatCompletionOnce(accountId, apiToken, prompt, timeoutMs),
        GENERATE_TIMEOUT_MS,
      )

      const content = (json as { choices?: { message?: { content?: unknown } }[] } | null)
        ?.choices?.[0]?.message?.content

      // With response_format/json_schema, different models encode the
      // structured result differently: some return a JSON-encoded string
      // (the OpenAI convention), others return an already-parsed object
      // directly in `content`. Both are accepted.
      let parsed: unknown
      if (typeof content === 'string' && content) {
        try {
          parsed = JSON.parse(content)
        } catch {
          throw new AiProviderError('The AI provider returned a malformed response.')
        }
      } else if (typeof content === 'object' && content !== null) {
        parsed = content
      } else {
        throw new AiProviderError('Empty response from the AI provider.')
      }

      if (!isValidGenerateOutput(parsed)) {
        throw new AiProviderError('The AI provider returned an unexpected response shape.')
      }

      return parsed
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw new AiProviderError('The AI provider request failed.')
    }
  },

  async embed(text: string): Promise<number[]> {
    try {
      const { accountId, apiToken } = getCredentials()

      const { json } = await withRetry(
        (timeoutMs) => fetchEmbeddingOnce(accountId, apiToken, text, timeoutMs),
        EMBED_TIMEOUT_MS,
      )

      const values = (json as { data?: { embedding?: unknown }[] } | null)?.data?.[0]?.embedding

      if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSION) {
        throw new AiProviderError('The embedding provider returned an unexpected response shape.')
      }

      return values as number[]
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw new AiProviderError('The embedding provider request failed.')
    }
  },
}
