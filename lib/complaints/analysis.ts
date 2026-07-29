import { buildComplaintSummary } from '@/lib/complaints/summary'
import { getGovernmentEntityByName } from '@/lib/mock/government-entities'
import type { ComplaintAnalysis, ConfidenceLevel } from '@/types/wasal'

export type RoutingForAnalysis = {
  entityId: string | null
  entityName: string | null
  officialUrl: string | null
  confidence: ConfidenceLevel
  reason: string | null
  complaintTypeLabel?: string | null
}

/**
 * Resolves a real, DB-backed routing decision into the ComplaintAnalysis
 * shape RecommendationCard expects — the single shared builder used both by
 * the live turn handler (components/wasal/wasal-chat.tsx's runComplaintTurn)
 * and the server-side resume path (app/wasal/page.tsx), so a reconstructed
 * "ready" state on resume is built exactly the same way as a freshly-reached
 * one. Never fabricates requiredDocuments/submissionSteps — always empty, no
 * real database-backed source exists yet. entityIconKey is resolved by
 * matching routing.entityName against the mock file's own entity list purely
 * for its icon glyph (a cosmetic choice among 5 fixed logos) — not used for
 * any content field.
 */
export function buildComplaintAnalysisFromRouting(
  routing: RoutingForAnalysis,
  collectedFields: Record<string, string>,
): ComplaintAnalysis | null {
  if (!routing.entityId || !routing.entityName || !routing.officialUrl) return null

  const mockEntity = getGovernmentEntityByName(routing.entityName)
  const reason = routing.reason ?? ''
  const confidenceScore =
    routing.confidence === 'high' ? 90 : routing.confidence === 'medium' ? 65 : 35

  const { summaryText } = buildComplaintSummary({
    entityName: routing.entityName,
    complaintTypeLabel: routing.complaintTypeLabel,
    collectedFields,
  })

  return {
    entityId: routing.entityId,
    entityName: routing.entityName,
    entityIconKey: mockEntity?.iconKey ?? 'commerce',
    entityDescription: reason,
    officialUrl: routing.officialUrl,
    category: routing.complaintTypeLabel ?? reason,
    summary: summaryText,
    details: summaryText,
    requiredDocuments: [],
    submissionSteps: [],
    confidence: routing.confidence,
    confidenceScore,
  }
}
