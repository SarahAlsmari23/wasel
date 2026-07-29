import type { MockMessage } from '@/types/conversation'
import type { ComplaintAnalysis, WasalMode } from '@/types/wasal'
import type { ComplaintAnswers } from '@/lib/wasal/mock-engine'

/**
 * Keeps the in-progress conversation alive across the sign-in round trip.
 *
 * Signing in is a full page navigation (and, with Google, a trip to another
 * origin and back), so component state is lost. sessionStorage is scoped to
 * the tab and survives both, which means the user returns to the exact
 * conversation they were having instead of an empty chat.
 *
 * Nothing here is persisted server-side — this is purely so the UI can resume,
 * and it is cleared as soon as the user starts a new conversation.
 */
// Bumped for Phase 6.8: any tab still holding a `v1` blob is discarded rather
// than restored — a `v1` entry could predate the "never fabricate
// requiredDocuments/submissionSteps" fix (Phase 6.6/6.7) and carry a stale
// `analysis` with populated mock arrays that should no longer ever exist.
// Starting fresh under a new key is simpler and safer than trying to migrate
// an unversioned shape in place.
const STORAGE_KEY = 'wasal:chat:v2'

export type PersistedConversation = {
  conversationId: string
  messages: MockMessage[]
  /** Which of the two /wasal experiences was active — the single source of
   * truth for restoring complaint mode on a plain reload. Never inferred
   * from `analysis`/`stepIndex`/`pendingComplaint`, all of which can be
   * absent or stale for reasons unrelated to the current mode. */
  mode?: WasalMode
  /** Legacy fallback engine's answers only — these do NOT reflect the real
   * API-driven complaint flow's progress. See `collectedFields`/
   * `pendingFieldKey` for that. Present once the complaint builder has
   * started. */
  complaintAnswers?: ComplaintAnswers
  stepIndex?: number
  analysis?: ComplaintAnalysis | null
  /** The real, API-driven complaint flow's collected answers, keyed by
   * complaint_types.required_fields' real keys (e.g. `merchant_name`) —
   * distinct from the legacy `complaintAnswers` above. */
  collectedFields?: Record<string, string>
  /** Which required-field key the user's next answer should be recorded
   * under, per the server's last `nextFieldKey` — restored so a reload
   * mid-complaint doesn't re-ask an already-answered field. */
  pendingFieldKey?: string | null
  /** Set only while a guest's complaint request is gated on sign-in — never
   * a general "currently in complaint mode" flag (that's `mode`, above). */
  pendingComplaint?: boolean
  /** Entities already announced, so the modal is not shown twice. */
  announcedEntities?: string[]
  /**
   * Real DB conversation ids (authenticated users only) — lets a reload or
   * sign-in round trip resume the same DB conversation instead of creating a
   * duplicate on the next message. Absent for guests or before the first
   * successful DB write.
   */
  dbConversationId?: string
  dbComplaintConversationId?: string
  savedAt: number
}

/** Discard anything older than this so a stale tab doesn't resurrect a chat. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function saveConversation(state: Omit<PersistedConversation, 'savedAt'>): void {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() } satisfies PersistedConversation),
    )
  } catch {
    // Private browsing or a full quota — resuming is a convenience, never a
    // requirement, so a failure here must not interrupt the conversation.
  }
}

export function loadConversation(): PersistedConversation | null {
  if (!isBrowser()) return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const candidate = parsed as Partial<PersistedConversation>
    if (!Array.isArray(candidate.messages) || typeof candidate.conversationId !== 'string') {
      return null
    }
    if (typeof candidate.savedAt !== 'number' || Date.now() - candidate.savedAt > MAX_AGE_MS) {
      clearConversation()
      return null
    }

    // Defense in depth (Phase 6.8, Part 5): requiredDocuments/submissionSteps
    // must never be shown as real content — forced empty here regardless of
    // whatever a given write path stored, rather than trusting every future
    // writer to have gotten this right.
    if (candidate.analysis) {
      candidate.analysis = {
        ...candidate.analysis,
        requiredDocuments: [],
        submissionSteps: [],
      }
    }

    return candidate as PersistedConversation
  } catch {
    return null
  }
}

export function clearConversation(): void {
  if (!isBrowser()) return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignored for the same reason as saveConversation.
  }
}
