import type { GovernmentIconKey } from '@/lib/mock/government-entities'

/** The two experiences offered on /wasal (Phase 2 "AI Modes"). */
export type WasalMode = 'assistant' | 'complaint'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * The complaint analysis Wasal produces at the end of the Complaint Builder
 * flow. Drives the Government Recommendation Card and the summary the user
 * can save, copy, or carry to the authority's official portal.
 */
export type ComplaintAnalysis = {
  entityId: string
  entityName: string
  entityIconKey: GovernmentIconKey
  entityDescription: string
  officialUrl: string
  category: string
  summary: string
  details: string
  requiredDocuments: string[]
  submissionSteps: string[]
  /**
   * How sure the matcher is about `entityId`. Internal only — deliberately not
   * rendered, so the final recommendation reads as a decision rather than a
   * probability.
   */
  confidence: ConfidenceLevel
  /** 0–100 companion to `confidence`. Also internal only. */
  confidenceScore: number
}

/** Stages of the Phase 2 "Complaint Progress Timeline". */
export type ComplaintProgressStage = 'analysis' | 'entity' | 'summary' | 'ready' | 'submitted'

export type ProgressStageState = 'done' | 'current' | 'upcoming'
