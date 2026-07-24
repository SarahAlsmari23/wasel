export type ChatIntent =
  | 'general_question'
  | 'entity_identification'
  | 'missing_information'
  | 'complaint_guidance'
  | 'draft_assistance'

export type ChatHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Sanitized complaint context sent to the assistant. Deliberately excludes
 * any national ID field, masked or raw — the model never needs it. Fields
 * beyond this shape must never be added without updating the sanitizer's
 * allow-list in lib/ai/sanitize.ts.
 */
export type ChatComplaintContext = {
  domainId?: string
  entityId?: string
  serviceId?: string
  complaintTypeId?: string
  title?: string
  description?: string
  city?: string
  issueDate?: string
}

export type ChatRequest = {
  conversationId: string
  message: string
  history?: ChatHistoryItem[]
  intent?: ChatIntent
  complaintContext?: ChatComplaintContext
}
// No userId field, ever — identity is derived from the server session only.

export type ChatSource = {
  id: string
  title: string
  entityName?: string
  officialUrl?: string
  excerpt?: string
}

export type ChatSuggestedEntity = {
  name: string
  reason: string
}

export type ChatConfidence = 'high' | 'medium' | 'low'

export type ChatSuccessResponse = {
  answer: string
  intent: ChatIntent
  confidence: ChatConfidence
  grounded: boolean
  missingFields: string[]
  suggestedQuestions: string[]
  suggestedEntity?: ChatSuggestedEntity
  sources: ChatSource[]
  safetyNotice?: string
}

export type ChatErrorResponse = {
  error: string
}

export type ChatResponse = ChatSuccessResponse | ChatErrorResponse
