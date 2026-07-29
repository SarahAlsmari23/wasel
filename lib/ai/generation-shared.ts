import type { AiGenerateOutput } from '@/lib/ai/provider'

/**
 * Wraps every generation-provider failure mode (missing credentials,
 * network, HTTP/auth error, timeout, malformed structured output), shared
 * by every generation provider (lib/ai/cloudflare.ts, lib/ai/openai.ts). The
 * original error is never attached — only this generic, internal-only
 * message travels with it, so app/api/ai/chat/route.ts can map any provider's
 * failure to the same safe, generic client-facing response regardless of
 * which provider is active.
 */
export class AiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderError'
  }
}

// Standard (lowercase) JSON Schema types — the OpenAI json_schema convention,
// which Cloudflare Workers AI's response_format/json_schema also follows.
// Shared verbatim by every generation provider so the model-facing contract
// never drifts between them.
//
// Deliberately never includes entityId, serviceId, complaintTypeId, or
// officialUrl: the model must never be asked for a database identifier or an
// official URL — those are only ever resolved server-side from RAG results /
// reference-table lookups (see types/ai.ts's ChatRouting and this file's
// AiGenerateOutput exclusion of `routing`).
export const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    intent: {
      type: 'string',
      enum: [
        'entity_information',
        'government_service_question',
        'complaint_guidance',
        'create_complaint',
        'identity_question',
        'out_of_scope',
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
    // Optional — the model may omit either. `nextQuestion` is a plain
    // `string` (not `['string', 'null']`): Cloudflare's json_schema
    // enforcement for its current model cannot reliably satisfy an
    // array-form nullable `type` once the prompt is long/complex — confirmed
    // to cause "JSON Model couldn't be met" (Cloudflare error 5024) with the
    // real system prompt, even though it works with a trivial one. Kept as a
    // plain string for both providers so the wire contract never diverges
    // between them. No behavior change: app/api/ai/chat/route.ts already
    // treats an empty/omitted value the same as null.
    nextQuestion: { type: 'string' },
    readyToGenerateComplaint: { type: 'boolean' },
  },
  required: ['answer', 'intent', 'confidence', 'grounded', 'missingFields', 'suggestedQuestions'],
}

/**
 * Shared, provider-agnostic validation of a parsed generation response.
 * Every generation provider must run its parsed JSON through this exact
 * function before returning — never a per-provider reimplementation.
 */
export function isValidGenerateOutput(value: unknown): value is AiGenerateOutput {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  if (!(
    typeof candidate.answer === 'string' &&
    typeof candidate.intent === 'string' &&
    typeof candidate.confidence === 'string' &&
    typeof candidate.grounded === 'boolean' &&
    Array.isArray(candidate.missingFields) &&
    Array.isArray(candidate.suggestedQuestions)
  )) {
    return false
  }

  // Both new fields are optional — only type-checked when present, so a
  // model response that omits them (today's actual behavior) still validates.
  if (
    candidate.nextQuestion !== undefined &&
    candidate.nextQuestion !== null &&
    typeof candidate.nextQuestion !== 'string'
  ) {
    return false
  }
  if (
    candidate.readyToGenerateComplaint !== undefined &&
    typeof candidate.readyToGenerateComplaint !== 'boolean'
  ) {
    return false
  }

  return true
}
