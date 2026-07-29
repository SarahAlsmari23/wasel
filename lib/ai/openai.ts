import OpenAI from 'openai'
import type { AiGenerateInput, AiGenerateOutput } from '@/lib/ai/provider'
import {
  AiProviderError,
  isValidGenerateOutput,
  RESPONSE_JSON_SCHEMA,
} from '@/lib/ai/generation-shared'

// gpt-4o-mini: current, generally-available OpenAI model that supports
// Structured Outputs (json_schema response format) and reliable Arabic
// generation, at low latency/cost — a reasonable default for this
// conversational, low-latency use case. Overridable per-account via
// OPENAI_MODEL (Part 4) in case the configured account requires a
// different model.
const DEFAULT_MODEL = 'gpt-4o-mini'

const GENERATE_TIMEOUT_MS = 45_000

let cachedClient: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new AiProviderError('OpenAI credentials are not configured.')
  }
  // Reused across calls — the SDK client itself holds no per-request state,
  // only credentials/timeout/retry configuration.
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey,
      timeout: GENERATE_TIMEOUT_MS,
      // A single retry only, matching the existing Cloudflare provider's
      // MAX_ATTEMPTS=2 — the SDK itself only retries the error classes it
      // already knows are safe to retry (429, 5xx, connection errors).
      maxRetries: 1,
    })
  }
  return cachedClient
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

/**
 * Maps every OpenAI SDK failure mode to the same generic, internal-only
 * AiProviderError the Cloudflare provider produces — never the raw SDK
 * error (which can carry request ids, org/project identifiers, or the raw
 * response body).
 */
function mapOpenAiError(error: unknown): AiProviderError {
  if (
    error instanceof OpenAI.APIUserAbortError ||
    error instanceof OpenAI.APIConnectionTimeoutError
  ) {
    return new AiProviderError('Request to the AI provider timed out.')
  }
  // Covers AuthenticationError, PermissionDeniedError, RateLimitError,
  // NotFoundError (invalid/inaccessible model), BadRequestError,
  // UnprocessableEntityError, InternalServerError, APIConnectionError, and
  // any other OpenAI.APIError subtype — all collapse to the same generic,
  // internal-only message; the specific category is only ever logged
  // internally (see categorizeGenerationFailure in route.ts), never
  // returned to the client.
  return new AiProviderError('The AI provider request failed.')
}

export const openaiProvider = {
  async generate({ prompt }: AiGenerateInput): Promise<AiGenerateOutput> {
    const client = getClient()

    let completion: OpenAI.Chat.Completions.ChatCompletion
    try {
      completion = await client.chat.completions.create({
        model: getModel(),
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'wasal_chat_response',
            schema: RESPONSE_JSON_SCHEMA,
          },
        },
      })
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw mapOpenAiError(error)
    }

    const content = completion.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content) {
      throw new AiProviderError('Empty response from the AI provider.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new AiProviderError('The AI provider returned a malformed response.')
    }

    if (!isValidGenerateOutput(parsed)) {
      throw new AiProviderError('The AI provider returned an unexpected response shape.')
    }

    return parsed
  },
}
