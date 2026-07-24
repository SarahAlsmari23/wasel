import { GoogleGenAI } from '@google/genai'
import type { AiGenerateInput, AiGenerateOutput, AiProvider } from '@/lib/ai/provider'

const MODEL_NAME = 'gemini-3.5-flash'
const GENERATE_TIMEOUT_MS = 20_000

const EMBEDDING_MODEL_NAME = 'gemini-embedding-2'
const EMBEDDING_DIMENSION = 768
const EMBED_TIMEOUT_MS = 10_000

/**
 * Wraps every Gemini failure mode (missing key, network, SDK/auth error,
 * timeout, malformed structured output). The original SDK error is never
 * attached — only this generic, internal-only message travels with it.
 */
export class AiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderError'
  }
}

const RESPONSE_SCHEMA = {
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AiProviderError('Request to the AI provider timed out.'))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

let cachedClient: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new AiProviderError('GEMINI_API_KEY is not configured.')
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey })
  }
  return cachedClient
}

export const geminiProvider: AiProvider = {
  async generate({ prompt }: AiGenerateInput): Promise<AiGenerateOutput> {
    try {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new AiProviderError('GEMINI_API_KEY is not configured.')
      }

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
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
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
                responseSchema: RESPONSE_SCHEMA,
              },
            }),
            signal: controller.signal,
          },
        )

        if (!httpResponse.ok) {
          // Status preserved on a plain Error (not AiProviderError) so the
          // existing categorizeGeminiError(...) status branch below can
          // still bucket it (auth-error / model-not-found / rate-limited /
          // provider-server-error). The response body is never read here.
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

  async embed(text: string): Promise<number[]> {
    try {
      const ai = getClient()

      const response = await withTimeout(
        ai.models.embedContent({
          model: EMBEDDING_MODEL_NAME,
          contents: text,
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        }),
        EMBED_TIMEOUT_MS,
      )

      const values = response.embeddings?.[0]?.values
      if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new AiProviderError('The embedding provider returned an unexpected response shape.')
      }

      return values
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw new AiProviderError('The embedding provider request failed.')
    }
  },
}
