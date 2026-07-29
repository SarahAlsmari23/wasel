import { COMPLAINT_INTRO } from '@/lib/wasal/mock-engine'
import type { MessageKind, MockMessage } from '@/types/conversation'

/**
 * Content fingerprints for messages written before Phase 6.9 (no `kind`
 * field at all) — used only as a fallback so an old sessionStorage entry can
 * still be classified safely. Any message created from Phase 6.9 onward
 * always carries an explicit `kind` and never needs this.
 */
const AUTHORITY_SUMMARY_MARKERS = ['بحسب وصفك، الجهة المختصة', 'المستندات التي يُفضّل تجهيزها']
const LEGACY_ANALYSIS_MARKERS = ['اكتمل التحليل', 'بطاقة الجهة المختصة']

function looksLikeComplaintOpening(content: string): boolean {
  return content.startsWith(COMPLAINT_INTRO)
}

function looksLikeAuthoritySummary(content: string): boolean {
  return AUTHORITY_SUMMARY_MARKERS.some((marker) => content.includes(marker))
}

function looksLikeLegacyAnalysis(content: string): boolean {
  return LEGACY_ANALYSIS_MARKERS.every((marker) => content.includes(marker))
}

/**
 * Resolves a message's real kind — trusts an explicit `kind` set at creation
 * time (every Phase 6.9+ write path sets one); falls back to content
 * pattern-matching only for older, unmarked messages so a pre-existing
 * sessionStorage entry still loads safely (Phase 6.9, Part 1).
 */
export function classifyMessage(message: MockMessage): MessageKind {
  if (message.kind) return message.kind
  if (message.cta) return 'system'
  if (message.role === 'user') return 'user'
  if (looksLikeComplaintOpening(message.content)) return 'complaint_opening'
  if (looksLikeLegacyAnalysis(message.content)) return 'legacy_analysis'
  if (looksLikeAuthoritySummary(message.content)) return 'authority_summary'
  return 'assistant'
}

/**
 * Keeps only genuine conversational turns — real user messages and real
 * assistant conversational replies. Drops everything UI-only or
 * card-shaped (complaint-builder opening question, authority-card summary
 * prose, legacy analysis closing text, inline CTA messages) so none of it
 * is ever replayed as a normal chat bubble after a guest resumes into an
 * authenticated session (Phase 6.9, Parts 2 and 5).
 */
export function sanitizeGenuineMessages(messages: MockMessage[]): MockMessage[] {
  return messages.filter((message) => {
    const kind = classifyMessage(message)
    return kind === 'user' || kind === 'assistant'
  })
}
