export type ConversationStatus = 'active' | 'completed'

export type MessageRole = 'user' | 'assistant'

export type MockMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}

export type MockConversation = {
  id: string
  title: string
  preview: string
  status: ConversationStatus
  updatedAt: string
  messages: MockMessage[]
}
