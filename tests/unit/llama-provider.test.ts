import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  configuredLlamaModels,
  DEFAULT_LLAMA_FALLBACK_MODEL,
  DEFAULT_LLAMA_MODEL,
  generateWithLlama,
} from '@/lib/ai/cloudflare'
import { AiProviderError } from '@/lib/ai/generation-shared'
import { configuredProviderChain, generateAnswer } from '@/lib/ai/provider'

const realFetch = globalThis.fetch
const ENV_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'LLAMA_MODEL',
  'LLAMA_FALLBACK_MODEL',
  'AI_PRIMARY_PROVIDER',
  'AI_FALLBACK_PROVIDER',
  'AI_PROVIDER',
  'GEMINI_API_KEY',
]
const saved: Record<string, string | undefined> = {}

function completion(content: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [
        { message: { content: typeof content === 'string' ? content : JSON.stringify(content) } },
      ],
    }),
    { status, headers: { 'content-type': 'application/json' } },
  )
}

const VALID = {
  answer: 'الجهة المختصة هي الشركة الوطنية للمياه.',
  intent: 'entity_information',
  confidence: 'high',
  grounded: true,
  missingFields: [],
  suggestedQuestions: [],
}

describe('Llama provider', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
    for (const key of ENV_KEYS) delete process.env[key]
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acct'
    process.env.CLOUDFLARE_API_TOKEN = 'token'
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('defaults to Llama 4 Scout with Llama 3.3 70B as fallback', () => {
    assert.deepEqual(configuredLlamaModels(), [DEFAULT_LLAMA_MODEL, DEFAULT_LLAMA_FALLBACK_MODEL])
    assert.match(DEFAULT_LLAMA_MODEL, /llama-4-scout/)
    process.env.LLAMA_FALLBACK_MODEL = 'none'
    assert.deepEqual(configuredLlamaModels(), [DEFAULT_LLAMA_MODEL])
  })

  it('uses the primary model when it answers', async () => {
    const models: string[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      models.push(JSON.parse(String(init?.body)).model)
      return completion(VALID)
    }) as typeof fetch
    const result = await generateWithLlama({ prompt: 'p' })
    assert.equal(result.model, DEFAULT_LLAMA_MODEL)
    assert.equal(result.output.answer, VALID.answer)
    assert.deepEqual(models, [DEFAULT_LLAMA_MODEL])
  })

  it('falls back to the second Llama model when the primary returns unusable output', async () => {
    const models: string[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const model = JSON.parse(String(init?.body)).model
      models.push(model)
      return model === DEFAULT_LLAMA_MODEL ? completion('not json at all') : completion(VALID)
    }) as typeof fetch
    const result = await generateWithLlama({ prompt: 'p' })
    assert.equal(result.model, DEFAULT_LLAMA_FALLBACK_MODEL)
    assert.deepEqual(models, [DEFAULT_LLAMA_MODEL, DEFAULT_LLAMA_FALLBACK_MODEL])
  })

  it('retries a transient 503 once before falling back', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return calls === 1 ? new Response('busy', { status: 503 }) : completion(VALID)
    }) as typeof fetch
    const result = await generateWithLlama({ prompt: 'p' })
    assert.equal(result.model, DEFAULT_LLAMA_MODEL)
    assert.equal(calls, 2)
  })

  it('throws AiProviderError (never a fabricated answer) when every model fails', async () => {
    globalThis.fetch = (async () => new Response('nope', { status: 400 })) as typeof fetch
    await assert.rejects(generateWithLlama({ prompt: 'p' }), AiProviderError)
  })

  it('falls back to Llama 3.3 when Scout times out', async () => {
    const models: string[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const model = JSON.parse(String(init?.body)).model
      models.push(model)
      if (model === DEFAULT_LLAMA_MODEL) {
        const error = new Error('aborted')
        error.name = 'AbortError'
        throw error
      }
      return completion(VALID)
    }) as typeof fetch
    const result = await generateWithLlama({ prompt: 'p' })
    assert.equal(result.model, DEFAULT_LLAMA_FALLBACK_MODEL)
    assert.deepEqual(models, [DEFAULT_LLAMA_MODEL, DEFAULT_LLAMA_FALLBACK_MODEL])
  })

  it('never calls Gemini when Llama fails, even with Gemini credentials present', async () => {
    process.env.GEMINI_API_KEY = 'present-but-unused'
    process.env.AI_PROVIDER = 'gemini'
    const hosts: string[] = []
    globalThis.fetch = (async (url: unknown) => {
      hosts.push(new URL(String(url)).host)
      return new Response('down', { status: 500 })
    }) as typeof fetch
    await assert.rejects(generateAnswer({ prompt: 'p' }), AiProviderError)
    assert.ok(hosts.length > 0)
    assert.ok(
      hosts.every((host) => host === 'api.cloudflare.com'),
      hosts.join(','),
    )
  })

  it('makes no fallback call when LLAMA_FALLBACK_MODEL is none', async () => {
    process.env.LLAMA_FALLBACK_MODEL = 'none'
    const models: string[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      models.push(JSON.parse(String(init?.body)).model)
      return completion('garbage')
    }) as typeof fetch
    await assert.rejects(generateWithLlama({ prompt: 'p' }), AiProviderError)
    assert.deepEqual(models, [DEFAULT_LLAMA_MODEL])
  })

  it('accepts fenced JSON from the model', async () => {
    globalThis.fetch = (async () =>
      completion('```json\n' + JSON.stringify(VALID) + '\n```')) as typeof fetch
    const result = await generateWithLlama({ prompt: 'p' })
    assert.equal(result.output.intent, 'entity_information')
  })
})

describe('provider chain configuration', () => {
  const keys = ['AI_PRIMARY_PROVIDER', 'AI_FALLBACK_PROVIDER', 'AI_PROVIDER'] as const
  const before: Record<string, string | undefined> = {}
  beforeEach(() =>
    keys.forEach((key) => ((before[key] = process.env[key]), delete process.env[key])),
  )
  afterEach(() =>
    keys.forEach((key) =>
      before[key] === undefined ? delete process.env[key] : (process.env[key] = before[key]),
    ),
  )

  it('defaults to Llama even when the legacy AI_PROVIDER says gemini', () => {
    process.env.AI_PROVIDER = 'gemini'
    assert.deepEqual(configuredProviderChain(), ['llama'])
  })
  it('honours an explicit primary and fallback', () => {
    process.env.AI_PRIMARY_PROVIDER = 'llama'
    process.env.AI_FALLBACK_PROVIDER = 'gemini'
    assert.deepEqual(configuredProviderChain(), ['llama', 'gemini'])
  })
  it('treats cloudflare as an alias for llama', () => {
    process.env.AI_PRIMARY_PROVIDER = 'cloudflare'
    assert.deepEqual(configuredProviderChain(), ['llama'])
  })
  it('rejects an unknown primary provider', () => {
    process.env.AI_PRIMARY_PROVIDER = 'mystery'
    assert.throws(() => configuredProviderChain(), AiProviderError)
  })
})
