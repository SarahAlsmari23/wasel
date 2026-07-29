import type { ChatComplaintContext, ChatHistoryItem } from '@/types/ai'

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_ITEMS = 10
const MAX_DESCRIPTION_LENGTH = 4000
const MAX_COLLECTED_FIELD_VALUE_LENGTH = 500
const MAX_COLLECTED_FIELDS = 20

// Matches "nationalid" too, as a second, defensive layer — the primary
// defense is that nationalId is never part of the allow-list below.
const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|authorization|api[_-]?key|nationalid/i

// Excludes collectedFields deliberately — it's a nested map, not a flat
// string, and is sanitized separately below.
const COMPLAINT_CONTEXT_ALLOWED_KEYS: Exclude<keyof ChatComplaintContext, 'collectedFields'>[] = [
  'domainId',
  'entityId',
  'serviceId',
  'complaintTypeId',
  'title',
  'description',
  'city',
  'issueDate',
]

function stripSensitiveKeys<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, fieldValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue
    result[key as keyof T] = fieldValue as T[keyof T]
  }
  return result
}

export function sanitizeMessage(message: string): string {
  return message.trim().slice(0, MAX_MESSAGE_LENGTH)
}

export function sanitizeHistory(history: ChatHistoryItem[] | undefined): ChatHistoryItem[] {
  if (!history || history.length === 0) return []
  return history.slice(-MAX_HISTORY_ITEMS).map((item) => ({
    role: item.role,
    content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
  }))
}

/**
 * Reduces a complaint context down to an explicit allow-list of fields
 * before it can ever reach a prompt. Never includes a national ID in any
 * form — masked or raw. Any field not in the allow-list is dropped, so a
 * new sensitive field added to the complaint form later does not leak here
 * by default.
 */
export function sanitizeComplaintContext(
  context: ChatComplaintContext | undefined,
): ChatComplaintContext | undefined {
  if (!context) return undefined

  const stripped = stripSensitiveKeys(context)
  const sanitized: ChatComplaintContext = {}

  for (const key of COMPLAINT_CONTEXT_ALLOWED_KEYS) {
    const rawValue = stripped[key]
    if (typeof rawValue !== 'string') continue

    const trimmed = rawValue.trim()
    if (trimmed === '') continue

    sanitized[key] = key === 'description' ? trimmed.slice(0, MAX_DESCRIPTION_LENGTH) : trimmed
  }

  // collectedFields is a nested map, not a flat string — sanitized on its
  // own: each nested key gets the same sensitive-key check as every
  // top-level field, and each value is trimmed/length-capped the same way.
  const rawCollectedFields = stripped.collectedFields
  if (
    typeof rawCollectedFields === 'object' &&
    rawCollectedFields !== null &&
    !Array.isArray(rawCollectedFields)
  ) {
    const cleanedFields: Record<string, string> = {}
    for (const [fieldKey, fieldValue] of Object.entries(rawCollectedFields)) {
      if (Object.keys(cleanedFields).length >= MAX_COLLECTED_FIELDS) break
      if (SENSITIVE_KEY_PATTERN.test(fieldKey)) continue
      if (typeof fieldValue !== 'string') continue

      const trimmedValue = fieldValue.trim()
      if (trimmedValue === '') continue

      cleanedFields[fieldKey] = trimmedValue.slice(0, MAX_COLLECTED_FIELD_VALUE_LENGTH)
    }
    if (Object.keys(cleanedFields).length > 0) {
      sanitized.collectedFields = cleanedFields
    }
  }

  return sanitized
}
