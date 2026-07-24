export type KnowledgeDocumentStatus = 'active' | 'inactive'

export type MockKnowledgeDocument = {
  id: string
  title: string
  excerpt: string
  entity: string
  sector: string
  status: KnowledgeDocumentStatus
  updatedAt: string
}
