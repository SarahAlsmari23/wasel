import type { GovernmentIconKey } from '@/lib/mock/government-entities'

export type ComplaintStatus = 'draft' | 'ready' | 'submitted' | 'completed'

export type ComplaintTimelineEntry = {
  label: string
  at: string
}

export type MockComplaint = {
  id: string
  title: string
  entityId: string
  entityName: string
  entityIconKey: GovernmentIconKey
  categoryName: string
  status: ComplaintStatus
  createdAt: string
  updatedAt: string
  referenceNumber: string
  /** Raw problem description as the user described it to Wasal. */
  description: string
  /** One-line AI summary shown on cards and in the recommendation panel. */
  summary: string
  city: string
  issueDate: string
  contactFullName: string
  /** The professional complaint letter Wasal generated. */
  draftText: string
  requiredDocuments: string[]
  timeline: ComplaintTimelineEntry[]
  /** Set when the complaint originated from a saved chat conversation. */
  conversationId?: string
}
