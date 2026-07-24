/**
 * Deliberately has no `content` field, anywhere in this module — only the
 * server-truncated `excerpt`. This structurally prevents full document
 * content from ever leaving lib/rag/retrieve.ts, even by accident.
 */
export type RetrievedDocument = {
  id: string
  title: string
  excerpt: string
  serviceId: string | null
  complaintTypeId: string | null
  similarity: number
  entityName?: string
  officialUrl?: string
}

export type RetrievalFilters = {
  serviceId?: string
  complaintTypeId?: string
}
