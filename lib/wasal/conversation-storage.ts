import type { MockMessage } from '@/types/conversation'
import type { ComplaintAnalysis } from '@/types/wasal'
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
const STORAGE_KEY = 'wasal:chat:v1'

export type PersistedConversation = {
  conversationId: string
  messages: MockMessage[]
  /** Present once the complaint builder has started. */
  complaintAnswers?: ComplaintAnswers
  stepIndex?: number
  analysis?: ComplaintAnalysis | null
  /** Set when the user asked to create a complaint but had to sign in first. */
  pendingComplaint?: boolean
  /** Entities already announced, so the modal is not shown twice. */
  announcedEntities?: string[]
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
