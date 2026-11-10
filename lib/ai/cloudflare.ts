import type { AiGenerateInput, AiGenerateOutput } from '@/lib/ai/provider'
import {
  AiProviderError,
  coerceGenerateOutput,
  parseModelJson,
  RESPONSE_JSON_SCHEMA,
} from '@/lib/ai/generation-shared'

/*
 * Meta Llama on Cloudflare Workers AI — Wasel's primary conversational model.
 *
 * Primary: Llama 4 Scout (17B active / 16 experts). Chosen over the
 * previously configured Llama 3.3 70B because Arabic is one of Llama 4's
 * officially supported languages (Llama 3.3's official list does not include
 * Arabic), it has a 131k-token context window, and it consumes roughly 2.6×
 * fewer Workers AI neurons per output token — which matters on the 10,000
 * neurons/day free allocation. Llama 3.3 70B is kept as an automatic
 * fallback model when Scout fails or returns unusable structured output.
 *
 * Both are overridable without a code change (LLAMA_MODEL /
 * LLAMA_FALLBACK_MODEL, "none" disables the fallback). The same Cloudflare
 * account also serves embeddings, which are deliberately untouched here:
 * changing the embedding model or its 768-dimension vectors requires a
 * separate, approved re-embedding migration.
 */
export const DEFAULT_LLAMA_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'
export const DEFAULT_LLAMA_FALLBACK_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const EMBEDDING_MODEL_NAME = '@cf/google/embeddinggemma-300m'
const EMBEDDING_DIMENSION = 768

/** Whole-turn generation budget across the primary and fallback models —
 * kept inside the chat route's own maxDuration with room for retrieval. */
const GENERATE_BUDGET_MS = 32_000
/** The primary model may use at most this much of the budget, so a slow
 * primary still leaves the fallback a real chance to answer. */
const PRIMARY_MAX_MS = 20_000
const EMBED_TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 400
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504])

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

/** Test/local-development override only; production always uses the real API. */
function apiBase(accountId: string): string {
  const override = process.env.CLOUDFLARE_API_BASE_URL?.trim()
  const base = override || 'https://api.cloudflare.com/client/v4'
  return `${base.replace(/\/$/, '')}/accounts/${accountId}/ai/v1`
}

export function configuredLlamaModels(): string[] {
  const primary = process.env.LLAMA_MODEL?.trim() || DEFAULT_LLAMA_MODEL
  const fallbackSetting = process.env.LLAMA_FALLBACK_MODEL?.trim()
  const fallback =
    fallbackSetting === 'none' ? null : fallbackSetting || DEFAULT_LLAMA_FALLBACK_MODEL
  return fallback && fallback !== primary ? [primary, fallback] : [primary]
}

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`Cloudflare API returned HTTP ${status}.`)
  }
}

async function postJson(url: string, apiToken: string, body: unknown, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) throw new HttpStatusError(response.status)
    try {
      return (await response.json()) as unknown
    } catch {
      throw new AiProviderError('The AI provider returned a malformed response.')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiProviderError('Request to the AI provider timed out.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractOutput(json: unknown): AiGenerateOutput {
  const content = (json as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]
    ?.message?.content

  const parsed =
    typeof content === 'string' && content
      ? parseModelJson(content)
      : typeof content === 'object' && content !== null
        ? content
        : undefined
  if (parsed === undefined) {
    throw new AiProviderError('The AI provider returned an empty or non-JSON response.')
  }

  const output = coerceGenerateOutput(parsed)
  if (!output) {
    throw new AiProviderError('The AI provider returned an unexpected response shape.')
  }
  return output
}

/** One model, with a single short retry on a transient HTTP status. */
async function generateWithModel(
  model: string,
  prompt: string,
  deadline: number,
): Promise<AiGenerateOutput> {
  const { accountId, apiToken } = getCredentials()
  const url = `${apiBase(accountId)}/chat/completions`
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
    temperature: 0.2,
    max_tokens: 900,
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining <= 500) throw new AiProviderError('Request to the AI provider timed out.')
    try {
      return extractOutput(await postJson(url, apiToken, body, remaining))
    } catch (error) {
      const retryable =
        error instanceof HttpStatusError && RETRYABLE_HTTP_STATUSES.has(error.status)
      if (!retryable || attempt === 2) {
        if (error instanceof AiProviderError) throw error
        throw new AiProviderError(
          error instanceof HttpStatusError
            ? `The AI provider returned HTTP ${error.status}.`
            : 'The AI provider request failed.',
        )
      }
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new AiProviderError('The AI provider request failed.')
}

export type LlamaGeneration = { output: AiGenerateOutput; model: string }

/**
 * Tries each configured Llama model in order within one shared time budget.
 * Throws AiProviderError only when every model failed — never returns a
 * fabricated answer.
 */
export async function generateWithLlama({ prompt }: AiGenerateInput): Promise<LlamaGeneration> {
  const models = configuredLlamaModels()
  const budgetDeadline = Date.now() + GENERATE_BUDGET_MS
  let lastError: unknown = null

  for (const [index, model] of models.entries()) {
    const isLast = index === models.length - 1
    const deadline = isLast ? budgetDeadline : Math.min(budgetDeadline, Date.now() + PRIMARY_MAX_MS)
    try {
      return { output: await generateWithModel(model, prompt, deadline), model }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof AiProviderError
    ? lastError
    : new AiProviderError('The AI provider request failed.')
}

export type LlamaJsonUsage = { promptTokens: number; completionTokens: number }
export type LlamaJsonResult = {
  json: unknown
  model: string
  usage: LlamaJsonUsage | null
  ms: number
}

/**
 * One structured (JSON-schema) completion from the primary Llama model only,
 * for server-side tasks other than the chat answer (complaint fact extraction
 * and drafting). No fallback model: the caller owns its own deterministic
 * fallback, which is better than a weaker model's Arabic. Bounded by
 * `timeoutMs`; one short retry on a transient HTTP status when time allows.
 * Returns the token usage Cloudflare reports, for cost observability.
 */
export async function runLlamaJson(input: {
  system: string
  user: string
  schema: { name: string; schema: Record<string, unknown> }
  maxTokens: number
  timeoutMs: number
  temperature?: number
}): Promise<LlamaJsonResult> {
  const { accountId, apiToken } = getCredentials()
  const model = configuredLlamaModels()[0]
  const url = `${apiBase(accountId)}/chat/completions`
  const body = {
    model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    response_format: { type: 'json_schema', json_schema: input.schema },
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens,
  }
  const started = Date.now()
  const deadline = started + input.timeoutMs
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining <= 500) throw new AiProviderError('Request to the AI provider timed out.')
    try {
      const raw = (await postJson(url, apiToken, body, remaining)) as {
        choices?: { message?: { content?: unknown } }[]
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      } | null
      const content = raw?.choices?.[0]?.message?.content
      const json =
        typeof content === 'string' && content
          ? parseModelJson(content)
          : typeof content === 'object' && content !== null
            ? content
            : undefined
      if (json === undefined) {
        throw new AiProviderError('The AI provider returned an empty or non-JSON response.')
      }
      const usage =
        raw?.usage && typeof raw.usage.prompt_tokens === 'number'
          ? {
              promptTokens: raw.usage.prompt_tokens,
              completionTokens: raw.usage.completion_tokens ?? 0,
            }
          : null
      return { json, model, usage, ms: Date.now() - started }
    } catch (error) {
      const retryable =
        error instanceof HttpStatusError && RETRYABLE_HTTP_STATUSES.has(error.status)
      if (!retryable || attempt === 2) {
        if (error instanceof AiProviderError) throw error
        throw new AiProviderError(
          error instanceof HttpStatusError
            ? `The AI provider returned HTTP ${error.status}.`
            : 'The AI provider request failed.',
        )
      }
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new AiProviderError('The AI provider request failed.')
}

async function embed(text: string): Promise<number[]> {
  try {
    const { accountId, apiToken } = getCredentials()
    const url = `${apiBase(accountId)}/embeddings`
    const deadline = Date.now() + EMBED_TIMEOUT_MS
    let json: unknown
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        json = await postJson(
          url,
          apiToken,
          { model: EMBEDDING_MODEL_NAME, input: text },
          Math.max(500, deadline - Date.now()),
        )
        break
      } catch (error) {
        const retryable =
          error instanceof HttpStatusError && RETRYABLE_HTTP_STATUSES.has(error.status)
        if (!retryable || attempt === 2 || deadline - Date.now() <= 500) throw error
        await sleep(RETRY_DELAY_MS)
      }
    }

    const values = (json as { data?: { embedding?: unknown }[] } | null)?.data?.[0]?.embedding
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSION) {
      throw new AiProviderError('The embedding provider returned an unexpected response shape.')
    }
    return values as number[]
  } catch (error) {
    if (error instanceof AiProviderError) throw error
    throw new AiProviderError('The embedding provider request failed.')
  }
}

/** Embeddings + (single-model-chain) generation, for callers that need both. */
export const cloudflareProvider = {
  async generate(input: AiGenerateInput): Promise<AiGenerateOutput> {
    return (await generateWithLlama(input)).output
  },
  embed,
}
