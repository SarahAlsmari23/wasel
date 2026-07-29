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

export function sanitizeCollectedFields(
  raw: Record<string, string> | undefined | null,
): Record<string, string> {
  const sanitized: Record<string, string> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return sanitized

  let totalLength = 0

  for (const key of KNOWN_COMPLAINT_FIELD_KEYS) {
    if (Object.keys(sanitized).length >= MAX_FIELD_COUNT) break

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
