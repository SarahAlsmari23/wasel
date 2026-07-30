/**
 * Server-authoritative (app/api/ai/chat/route.ts always has the final say
 * via lib/ai/intent-guards.ts, never the model alone). `entity_information`
 * covers facts about a specific entity (hours, phone, address, branches,
 * official link); `government_service_question` covers how a service works
 * (requirements, how to apply) — both get identical treatment in code (see
 * isInformationalIntent). `complaint_side_question` (Phase 7.2) is a
 * server-derived overlay, never something the model is asked to choose
 * itself — a relevant informational question asked mid-complaint that must
 * not be consumed as an answer to the pending field (see
 * lib/ai/intent-guards.ts's isLikelySideQuestion). `greeting` (Phase 7.3) is
 * the same kind of server-derived-only overlay, for a standalone greeting
 * ("مرحبا", "السلام عليكم") with nothing substantive attached — see
 * isGreetingOnly.
 */
export type ChatIntent =
  | 'entity_information'
  | 'government_service_question'
  | 'complaint_guidance'
  | 'create_complaint'
  | 'complaint_side_question'
  | 'identity_question'
  | 'greeting'
  | 'out_of_scope'

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
  /**
   * Free-form field-key → answer map for whatever the complaint-builder flow
   * has collected so far (e.g. `merchant_name`, `service_provider`) — keyed
   * to match complaint_types.required_fields' `key` values. Sanitized the
   * same way every other field is (lib/ai/sanitize.ts) before use; never
   * forwarded to the model as a raw object (see app/api/ai/chat/route.ts —
   * it's flattened into readable text, or omitted, before buildPrompt).
   */
  collectedFields?: Record<string, string>
  /**
   * Emergency release fix, Part 2 — the required_fields key this turn's
   * message was actually attributed to answering (or a correction's target
   * key), when the client believes it just merged a genuine new value for
   * it. Lets the server detect the exact "hard duplicate-question invariant"
   * violation: the same field being asked again right after it was
   * successfully answered. Purely a signal for that one check — never
   * trusted as authoritative for anything else (the server always
   * recomputes missing fields from persisted collected_information itself).
   */
  answeredFieldKey?: string
}

export type ChatRequest = {
  conversationId: string
  /**
   * The real, server-created `conversations.id` row for this turn —
   * present only when the client actually has one (authenticated complaint
   * flow after its opening save succeeded). Never the client-only
   * sessionStorage UUID carried by `conversationId` above. Used exclusively
   * to scope the saved-routing read/write (Phase 4D.1) — when absent, that
   * feature is skipped for the turn, but the rest of the request proceeds
   * normally.
   */
  dbConversationId?: string
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
  similarity: number
  excerpt?: string
}

export type ChatSuggestedEntity = {
  name: string
  reason: string
}

export type ChatConfidence = 'high' | 'medium' | 'low'

/**
 * Real, database-backed routing identifiers only. Always constructed
 * server-side from RAG results / reference-table lookups — never from raw
 * model output (see lib/ai/provider.ts's AiGenerateOutput, which structurally
 * excludes this field from what the AI provider can return).
 */
export type ChatRouting = {
  entityId: string | null
  entityName: string | null
  serviceId: string | null
  complaintTypeId: string | null
  confidence: ChatConfidence
  reason: string | null
  officialUrl: string | null
  /** Real complaint_types.name_ar, read server-side — never model-generated,
   * never client-supplied. Used only for display (the summary/category label),
   * never for routing decisions themselves. */
  complaintTypeLabel: string | null
}

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
  /**
   * New, optional fields (not yet populated by app/api/ai/chat/route.ts —
   * that wiring is a later, separately approved phase). Optional so existing
   * responses without them remain valid — see lib/ai/contracts.ts.
   */
  routing?: ChatRouting | null
  nextQuestion?: string | null
  /** The raw required_fields key the server selected `nextQuestion` for —
   * lets the client attribute its next answer to the right field. Always
   * server-computed, never part of what the model itself produces. */
  nextFieldKey?: string | null
  readyToGenerateComplaint?: boolean
  /**
   * Server-authoritative: true only when `routing` is confirmed to already
   * be persisted on the owned DB conversation (either just-written
   * successfully this turn, or previously-saved and reloaded) — never a
   * proxy for "routing looks trustworthy in memory". Purely a UI-honesty
   * signal; createComplaintAction still independently re-reads saved
   * routing as the actual security authority regardless of this flag.
   */
  routingPersisted?: boolean
}

export type ChatErrorResponse = {
  error: string
}

export type ChatResponse = ChatSuccessResponse | ChatErrorResponse
