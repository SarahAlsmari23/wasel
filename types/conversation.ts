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

export type MockMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  attachment?: MessageAttachment
  suggestedEntity?: ChatSuggestedEntity
  sources?: ChatSource[]
  cta?: MessageCta
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
