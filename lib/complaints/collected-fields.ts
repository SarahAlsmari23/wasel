import { KNOWN_COMPLAINT_FIELD_KEYS } from '@/lib/complaints/formal-letter'

/**
 * Sanitizes `collectedFields` before it ever reaches `buildFormalComplaintLetter`
 * or a database write. Iterating over the known-key allow-list (rather than
 * the caller-supplied object's own keys) means any key outside that list —
 * technical, internal, or simply unrecognized — is silently dropped by
 * construction; it is never read, let alone stored or rendered.
 */

const MAX_FIELD_COUNT = 20
const MAX_VALUE_LENGTH = 500
const MAX_TOTAL_LENGTH = 4000

/** `problem_description`/`city` are template-universal (every complaint type
 * uses them directly, never listed as an "additional" reference field) — see
 * lib/complaints/formal-letter.ts. Always allowed regardless of
 * `relevantFieldKeys` below. */
const ALWAYS_RELEVANT_KEYS = new Set(['problem_description', 'city'])

/**
 * @param relevantFieldKeys Phase 7.6, Part 5 — when provided (the current,
 * just-resolved complaint type's own `required_fields` keys), any other
 * known field key is dropped even though it's in the global
 * `KNOWN_COMPLAINT_FIELD_KEYS` allow-list. Without this, a field answered
 * under a *different*, earlier-resolved complaint type (e.g. `service_provider`
 * collected while the conversation was still routed to telecom, before an
 * explicit correction moved it to water) would still be sitting in
 * `collected_information` and leak into the final letter as a stale,
 * cross-sector reference line — this is the guard that prevents that.
 * Omitted entirely, this behaves exactly as before (every known key kept).
 */
export function sanitizeCollectedFields(
  raw: Record<string, string> | undefined | null,
  relevantFieldKeys?: ReadonlySet<string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return sanitized

  let totalLength = 0

  for (const key of KNOWN_COMPLAINT_FIELD_KEYS) {
    if (Object.keys(sanitized).length >= MAX_FIELD_COUNT) break
    if (relevantFieldKeys && !ALWAYS_RELEVANT_KEYS.has(key) && !relevantFieldKeys.has(key)) continue

    const rawValue = raw[key]
    if (typeof rawValue !== 'string') continue

    const trimmed = rawValue.trim()
    if (trimmed === '') continue

    const capped = trimmed.slice(0, MAX_VALUE_LENGTH)
    if (totalLength + capped.length > MAX_TOTAL_LENGTH) continue

    sanitized[key] = capped
    totalLength += capped.length
  }

  return sanitized
}
