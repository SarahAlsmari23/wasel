import type { ChatComplaintContext, ChatHistoryItem } from '@/types/ai'

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_ITEMS = 10
const MAX_DESCRIPTION_LENGTH = 4000

// Matches "nationalid" too, as a second, defensive layer — the primary
// defense is that nationalId is never part of the allow-list below.
const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|authorization|api[_-]?key|nationalid/i

const COMPLAINT_CONTEXT_ALLOWED_KEYS: (keyof ChatComplaintContext)[] = [
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

  return sanitized
}
