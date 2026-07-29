import type {
  ChatComplaintContext,
  ChatConfidence,
  ChatHistoryItem,
  ChatIntent,
  ChatRequest,
  ChatRouting,
  ChatSuccessResponse,
} from '@/types/ai'

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_ITEMS = 10
const MAX_HISTORY_ITEM_LENGTH = 2000
const MAX_DESCRIPTION_LENGTH = 4000

const VALID_INTENTS: ChatIntent[] = [
  'entity_information',
  'government_service_question',
  'complaint_guidance',
  'create_complaint',
  'complaint_side_question',
  'identity_question',
  'greeting',
  'out_of_scope',
]

const VALID_CONFIDENCE_LEVELS: ChatConfidence[] = ['high', 'medium', 'low']

// Deliberately excludes any national-ID-shaped key. Adding one here would be
// a privacy regression — see lib/ai/sanitize.ts for the matching allow-list.
const COMPLAINT_CONTEXT_ALLOWED_KEYS = [
  'domainId',
  'entityId',
  'serviceId',
  'complaintTypeId',
  'title',
  'description',
  'city',
  'issueDate',
  'collectedFields',
] as const

const MAX_COLLECTED_FIELD_VALUE_LENGTH = 500
const MAX_COLLECTED_FIELDS = 20

/** collectedFields is a nested key→string map, not a flat string — validated
 * on its own rather than by the generic per-key string check below. */
function isValidCollectedFields(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value)
  if (entries.length > MAX_COLLECTED_FIELDS) return false
  return entries.every(
    ([, fieldValue]) =>
      typeof fieldValue === 'string' && fieldValue.length <= MAX_COLLECTED_FIELD_VALUE_LENGTH,
  )
}

export type ValidationResult<T> = { valid: true; value: T } | { valid: false; error: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isValidHistoryItem(item: unknown): item is ChatHistoryItem {
  if (!isPlainObject(item)) return false
  if (item.role !== 'user' && item.role !== 'assistant') return false
  if (typeof item.content !== 'string' || item.content.length > MAX_HISTORY_ITEM_LENGTH)
    return false
  return true
}

function isValidComplaintContext(value: unknown): value is ChatComplaintContext | undefined {
  if (value === undefined) return true
  if (!isPlainObject(value)) return false

  for (const key of Object.keys(value)) {
    if (
      !COMPLAINT_CONTEXT_ALLOWED_KEYS.includes(
        key as (typeof COMPLAINT_CONTEXT_ALLOWED_KEYS)[number],
      )
    ) {
      return false
    }
  }

  for (const key of COMPLAINT_CONTEXT_ALLOWED_KEYS) {
    if (key === 'collectedFields') continue // validated separately below
    const fieldValue = value[key]
    if (fieldValue === undefined) continue
    if (typeof fieldValue !== 'string') return false
    if (key === 'description' && fieldValue.length > MAX_DESCRIPTION_LENGTH) return false
  }

  if (value.collectedFields !== undefined && !isValidCollectedFields(value.collectedFields)) {
    return false
  }

  return true
}

/**
 * Validates the shape of an incoming chat request. Returns a generic Arabic
 * error message on failure — never a description of what specifically was
 * malformed in a way that could leak internal structure.
 */
export function validateChatRequest(payload: unknown): ValidationResult<ChatRequest> {
  if (!isPlainObject(payload)) {
    return { valid: false, error: 'الطلب غير صالح.' }
  }

  const { conversationId, dbConversationId, message, history, intent, complaintContext } = payload

  if (!isNonEmptyString(conversationId)) {
    return { valid: false, error: 'معرف المحادثة مطلوب.' }
  }

  if (dbConversationId !== undefined && !isNonEmptyString(dbConversationId)) {
    return { valid: false, error: 'معرف محادثة قاعدة البيانات غير صالح.' }
  }

  if (!isNonEmptyString(message) || message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: 'الرسالة مطلوبة ويجب ألا تتجاوز الحد المسموح به.' }
  }

  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
      return { valid: false, error: 'سجل المحادثة غير صالح.' }
    }
    if (!history.every(isValidHistoryItem)) {
      return { valid: false, error: 'سجل المحادثة غير صالح.' }
    }
  }

  if (intent !== undefined && !VALID_INTENTS.includes(intent as ChatIntent)) {
    return { valid: false, error: 'نوع الطلب غير معروف.' }
  }

  if (!isValidComplaintContext(complaintContext)) {
    return { valid: false, error: 'بيانات الشكوى المرسلة غير صالحة.' }
  }

  return {
    valid: true,
    value: {
      conversationId,
      dbConversationId: dbConversationId as string | undefined,
      message,
      history: history as ChatHistoryItem[] | undefined,
      intent: intent as ChatIntent | undefined,
      complaintContext: complaintContext as ChatComplaintContext | undefined,
    },
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

/**
 * Validates `routing` only when present — every field is required within the
 * object once it exists (a partially-shaped routing object is never valid),
 * but the object itself is optional/nullable on the response as a whole.
 */
function isValidChatRouting(value: unknown): value is ChatRouting {
  if (!isPlainObject(value)) return false

  return (
    isNullableString(value.entityId) &&
    isNullableString(value.entityName) &&
    isNullableString(value.serviceId) &&
    isNullableString(value.complaintTypeId) &&
    typeof value.confidence === 'string' &&
    VALID_CONFIDENCE_LEVELS.includes(value.confidence as ChatConfidence) &&
    isNullableString(value.reason) &&
    isNullableString(value.officialUrl) &&
    isNullableString(value.complaintTypeLabel)
  )
}

/**
 * Validates a chat response from the API before it is ever rendered. Never
 * trust response JSON blindly — checks exactly the fields listed as the
 * minimum bar; optional fields (suggestedEntity, safetyNotice) are not
 * deep-validated. `routing`/`nextQuestion`/`readyToGenerateComplaint` are new,
 * optional fields (see types/ai.ts) — a response that omits them entirely
 * still validates, since app/api/ai/chat/route.ts doesn't populate them yet.
 */
export function isValidChatSuccessResponse(value: unknown): value is ChatSuccessResponse {
  if (!isPlainObject(value)) return false

  const baseValid =
    typeof value.answer === 'string' &&
    typeof value.intent === 'string' &&
    VALID_INTENTS.includes(value.intent as ChatIntent) &&
    typeof value.confidence === 'string' &&
    VALID_CONFIDENCE_LEVELS.includes(value.confidence as ChatConfidence) &&
    typeof value.grounded === 'boolean' &&
    isStringArray(value.missingFields) &&
    isStringArray(value.suggestedQuestions) &&
    Array.isArray(value.sources)

  if (!baseValid) return false

  if (value.routing !== undefined && value.routing !== null && !isValidChatRouting(value.routing)) {
    return false
  }

  if (
    value.nextQuestion !== undefined &&
    value.nextQuestion !== null &&
    typeof value.nextQuestion !== 'string'
  ) {
    return false
  }

  if (
    value.nextFieldKey !== undefined &&
    value.nextFieldKey !== null &&
    typeof value.nextFieldKey !== 'string'
  ) {
    return false
  }

  if (
    value.readyToGenerateComplaint !== undefined &&
    typeof value.readyToGenerateComplaint !== 'boolean'
  ) {
    return false
  }

  if (value.routingPersisted !== undefined && typeof value.routingPersisted !== 'boolean') {
    return false
  }

  return true
}
