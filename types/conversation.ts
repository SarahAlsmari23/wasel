import type { ChatSource, ChatSuggestedEntity } from '@/types/ai'

export type ConversationStatus = 'active' | 'completed'

/** Which of the two Wasal experiences produced this conversation. */
export type ConversationMode = 'assistant' | 'complaint'

export type MessageRole = 'user' | 'assistant'

export type MessageAttachment = {
  name: string
  /** Bytes — used only to render a human-readable size label. */
  size: number
  type: string
}

/**
 * An action offered inline underneath an assistant message, so moving from
 * conversation to complaint feels like a continuation of the chat rather than
 * a jump into a separate mode.
 */
export type MessageCta = 'create_complaint'

/**
 * Local-only classification of *why* a message exists — never sent to the
 * database (the `messages` table only ever stores role='user'|'assistant',
 * see supabase/migrations/0001) and never required: absent on any message
 * written before Phase 6.9, in which case it's inferred from content at
 * classification time (see lib/wasal/message-classification.ts). Set at
 * creation time everywhere a message is built, so restoring a guest's
 * pre-sign-in sessionStorage thread can keep genuine conversation
 * ('user'/'assistant') while dropping UI-only content that was never meant to
 * be replayed as a chat bubble.
 */
export type MessageKind =
  'user' | 'assistant' | 'complaint_opening' | 'authority_summary' | 'legacy_analysis' | 'system'

export type MockMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  attachment?: MessageAttachment
  suggestedEntity?: ChatSuggestedEntity
  sources?: ChatSource[]
  cta?: MessageCta
  kind?: MessageKind
}

export type MockConversation = {
  id: string
  title: string
  preview: string
  mode: ConversationMode
  status: ConversationStatus
  createdAt: string
  updatedAt: string
  messages: MockMessage[]
  /** Present when the conversation produced a government recommendation. */
  entityName?: string
  /** Present when the conversation was saved as a complaint. */
  complaintId?: string
}
