import type { AiGenerateInput, AiGenerateOutput } from '@/lib/ai/provider'
import {
  AiProviderError,
  isValidGenerateOutput,
  RESPONSE_JSON_SCHEMA,
} from '@/lib/ai/generation-shared'

// gemini-3.5-flash (used in an earlier phase of this project, see commit
// d944e09, "stabilize Gemini REST chat integration") was found to be under
// temporary provider-side high-demand load (HTTP 503 "UNAVAILABLE") when
// this phase re-enabled Gemini — confirmed via direct API calls, not a
// account/key issue. gemini-3.6-flash, confirmed available to this account
// via the models.list endpoint and verified working with the real
// structured-output schema below, is used instead. Plain REST call — no SDK
// dependency needed for generation (embeddings remain Cloudflare's
// responsibility unconditionally and are untouched by this provider).
//
// Overridable via GEMINI_MODEL (same pattern as OPENAI_MODEL in
// lib/ai/openai.ts) — the free-tier per-model daily quota (20
// requests/day/model, confirmed live during Phase 7.1 verification) means a
// busy testing session can exhaust one model's quota outright; this lets a
// different model be selected without a code change while quota resets.
const DEFAULT_MODEL_NAME = 'gemini-3.6-flash'
const GENERATE_TIMEOUT_MS = 20_000

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL_NAME
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new AiProviderError('GEMINI_API_KEY is not configured.')
  }
  return apiKey
}

export const geminiProvider = {
  async generate({ prompt }: AiGenerateInput): Promise<AiGenerateOutput> {
    try {
      const apiKey = getApiKey()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)

      // The timeout must stay active through fetch() AND response.json() —
      // fetch() can resolve as soon as headers arrive while the body is
      // still streaming, so clearing the timer right after fetch() would let
      // a slow-to-arrive body run unbounded. It's cleared exactly once, in
      // this block's own `finally`, after json() has fully resolved (or
      // thrown).
      let json: unknown
      try {
        const httpResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_JSON_SCHEMA,
              },
            }),
            signal: controller.signal,
          },
        )

        if (!httpResponse.ok) {
          // Status preserved on a plain Error (not AiProviderError) purely
          // for internal diagnostic logging (categorizeGenerationFailure in
          // route.ts) — the response body is never read here, and no status
          // branch changes the client-facing outcome.
          const statusError = new Error('Gemini API returned a non-success status.') as Error & {
            status: number
          }
          statusError.status = httpResponse.status
          throw statusError
        }

        try {
          json = await httpResponse.json()
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

      const candidates = (json as { candidates?: unknown })?.candidates
      const firstContent = Array.isArray(candidates)
        ? (candidates[0] as { content?: { parts?: unknown } } | undefined)?.content
        : undefined
      const parts = firstContent?.parts

      if (!Array.isArray(parts)) {
        throw new AiProviderError('Empty response from the AI provider.')
      }

      const text = parts
        .filter(
          (part): part is { text: string } =>
            typeof (part as { text?: unknown })?.text === 'string',
        )
        .map((part) => part.text)
        .join('')

      if (!text) {
        throw new AiProviderError('Empty response from the AI provider.')
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new AiProviderError('The AI provider returned a malformed response.')
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
}
