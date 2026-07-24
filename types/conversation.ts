import type { ChatSource, ChatSuggestedEntity } from '@/types/ai'

export type ConversationStatus = 'active' | 'completed'

export type MessageRole = 'user' | 'assistant'

export type MockMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  suggestedEntity?: ChatSuggestedEntity
  sources?: ChatSource[]
}

export type MockConversation = {
  id: string
  title: string
  preview: string
  status: ConversationStatus
  updatedAt: string
  messages: MockMessage[]
}
