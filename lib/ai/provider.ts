import type { ChatSuccessResponse } from '@/types/ai'
import { AiProviderError } from '@/lib/ai/generation-shared'
import { cloudflareProvider, generateWithLlama } from '@/lib/ai/cloudflare'
import { openaiProvider } from '@/lib/ai/openai'
import { geminiProvider } from '@/lib/ai/gemini'

export type AiGenerateInput = {
  prompt: string
}

export type AiGenerateOutput = Omit<ChatSuccessResponse, 'sources' | 'routing'>

export interface AiProvider {
  generate(input: AiGenerateInput): Promise<AiGenerateOutput>
  embed(text: string): Promise<number[]>
}

export type GenerationProvider = {
  generate(input: AiGenerateInput): Promise<AiGenerateOutput>
}

/**
 * Generation providers. `llama` (Meta Llama on Cloudflare Workers AI) is the
 * default primary; `gemini` and `openai` remain available as explicit,
 * opt-in alternatives or fallbacks. `cloudflare` is accepted as a legacy
 * alias for `llama`.
 *
 * Configuration:
 *   AI_PRIMARY_PROVIDER   llama | gemini | openai     (default: llama)
 *   AI_FALLBACK_PROVIDER  llama | gemini | openai     (default: none)
 *
 * The legacy AI_PROVIDER variable is no longer read for generation: Wasel's
 * primary model is Llama unless AI_PRIMARY_PROVIDER explicitly says otherwise.
 * Embeddings always use Cloudflare regardless (see lib/rag/retrieve.ts).
 */
const SUPPORTED = ['llama', 'gemini', 'openai'] as const
export type GenerationProviderId = (typeof SUPPORTED)[number]

function parseProviderId(raw: string | undefined): GenerationProviderId | null {
  const value = raw?.trim().toLowerCase()
  if (!value) return null
  if (value === 'cloudflare') return 'llama'
  return (SUPPORTED as readonly string[]).includes(value) ? (value as GenerationProviderId) : null
}

export function configuredProviderChain(): GenerationProviderId[] {
  const primaryRaw = process.env.AI_PRIMARY_PROVIDER
  const primary = primaryRaw ? parseProviderId(primaryRaw) : 'llama'
  if (!primary) {
    throw new AiProviderError('AI_PRIMARY_PROVIDER is not set to a supported value.')
  }
  const fallback = parseProviderId(process.env.AI_FALLBACK_PROVIDER)
  return fallback && fallback !== primary ? [primary, fallback] : [primary]
}

export type GenerationResult = {
  output: AiGenerateOutput
  provider: GenerationProviderId
  /** The concrete model that produced the answer (for logs and evaluation). */
  model: string
}

async function generateWith(
  provider: GenerationProviderId,
  input: AiGenerateInput,
): Promise<GenerationResult> {
  if (provider === 'llama') {
    const { output, model } = await generateWithLlama(input)
    return { output, provider, model }
  }
  if (provider === 'gemini') {
    return { output: await geminiProvider.generate(input), provider, model: 'gemini' }
  }
  return { output: await openaiProvider.generate(input), provider, model: 'openai' }
}

/**
 * Generates one answer through the configured provider chain. Throws
 * AiProviderError when every provider failed — callers must surface that as
 * an honest error, never substitute canned text.
 */
export async function generateAnswer(input: AiGenerateInput): Promise<GenerationResult> {
  let lastError: unknown = null
  for (const provider of configuredProviderChain()) {
    try {
      return await generateWith(provider, input)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof AiProviderError
    ? lastError
    : new AiProviderError('The AI provider request failed.')
}

/** @deprecated Kept for scripts; prefer generateAnswer(). */
export function getGenerationProvider(): GenerationProvider {
  return {
    async generate(input) {
      return (await generateAnswer(input)).output
    },
  }
}

export { cloudflareProvider }
