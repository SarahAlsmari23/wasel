const MAX_FALLBACK_TITLE_LENGTH = 60

/** The fixed title every complaint conversation starts with (see
 * persistComplaintOpening/createConversationAction) — defined in this module
 * (not lib/complaints/formal-letter.ts, which also needs it) so that
 * formal-letter.ts can import both this and `isMeaningfulTitle` from here
 * without the two modules importing each other. */
export const DEFAULT_CONVERSATION_TITLE = 'إعداد بلاغ جديد'

// Every known placeholder/default title this app has ever assigned
// automatically — a conversation/complaint still carrying one of these is
// never treated as "meaningfully titled", regardless of which surface reads
// it.
const GENERIC_TITLES = [DEFAULT_CONVERSATION_TITLE, 'محادثة جديدة', 'بلاغ جديد']

const GENERIC_TITLE_FALLBACK = 'محادثة بدون عنوان'

/** Exported so any surface that persists a title (not just displays one) can
 * apply the exact same "is this generic" check before deciding whether it's
 * safe to overwrite — see lib/complaints/formal-letter.ts and
 * lib/db/conversations.ts. */
export function isMeaningfulTitle(title: string): boolean {
  return title !== '' && !GENERIC_TITLES.includes(title)
}

/** Truncates to at most MAX_FALLBACK_TITLE_LENGTH without cutting a word in
 * half — same word-boundary approach lib/complaints/formal-letter.ts uses for
 * subjects, kept local here since this fallback only ever applies to a short
 * display title, never the formal letter itself. */
function truncateAtWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const slice = value.slice(0, maxLength)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd()
}

export type DisplayTitleInput = {
  /** The raw conversations.title (or complaints.title, sourced from the same
   * column) as stored. */
  title: string
  /** The generated complaint's subject, when a complaint already exists for
   * this conversation. */
  complaintSubject?: string | null
  /** The user's own problem description, when no complaint exists yet but
   * some has already been collected — never a paraphrase, only ever the
   * user's own words, truncated at a word boundary. */
  problemDescription?: string | null
}

/**
 * The single, shared title-resolution function for every surface that
 * displays a conversation or complaint title — dashboard conversations
 * list/detail, dashboard complaints list/detail, the resumed Wasal view's
 * page title, and ComplaintResultCard. Priority:
 *
 * 1. A meaningful, non-default `title` (never overwritten once real).
 * 2. The generated complaint's subject, when one exists.
 * 3. A short fallback built from the user's own problem description, when
 *    already known but no complaint exists yet.
 * 4. A generic, last-resort fallback.
 */
export function getDisplayTitle(input: DisplayTitleInput, locale: 'ar' | 'en' = 'ar'): string {
  const title = input.title.trim()
  if (isMeaningfulTitle(title) && title !== GENERIC_TITLE_FALLBACK) return title

  const subject = input.complaintSubject?.trim()
  if (subject) return subject

  const description = input.problemDescription?.trim()
  if (description) return truncateAtWordBoundary(description, MAX_FALLBACK_TITLE_LENGTH)

  return locale === 'en' ? 'Untitled conversation' : GENERIC_TITLE_FALLBACK
}

/**
 * Stored placeholder titles are Arabic (they are persisted data, shared by
 * both languages); English readers see the equivalent English placeholder.
 * Real, user- or content-derived titles are always shown as written.
 */
const ENGLISH_PLACEHOLDER_TITLES: Record<string, string> = {
  [DEFAULT_CONVERSATION_TITLE]: 'New complaint',
  'محادثة جديدة': 'New conversation',
  'بلاغ جديد': 'New complaint',
  [GENERIC_TITLE_FALLBACK]: 'Untitled conversation',
}

export function localizeTitle(title: string, locale: 'ar' | 'en'): string {
  if (locale === 'ar') return title
  return ENGLISH_PLACEHOLDER_TITLES[title.trim()] ?? title
}

export type ComplaintStatusPresentation = {
  label: string
  badgeVariant: 'draft' | 'ready' | 'submitted' | 'completed'
}

/**
 * Maps the real DB status vocabulary ('draft' | 'generated' | 'completed',
 * see supabase/migrations/0001) plus the separate `submitted_at` timestamp to
 * the labels a user should see — never a 'submitted' status value, which
 * doesn't exist in the schema.
 */
const STATUS_LABELS = {
  ar: { completed: 'مكتمل', submitted: 'تم التقديم', ready: 'جاهز للتقديم', draft: 'مسودة' },
  en: { completed: 'Completed', submitted: 'Submitted', ready: 'Ready to submit', draft: 'Draft' },
} as const

export function getComplaintStatusPresentation(
  status: string,
  submittedAt: string | null,
  locale: 'ar' | 'en' = 'ar',
): ComplaintStatusPresentation {
  const labels = STATUS_LABELS[locale]
  if (status === 'completed') {
    return { label: labels.completed, badgeVariant: 'completed' }
  }
  if (status === 'generated') {
    return submittedAt
      ? { label: labels.submitted, badgeVariant: 'submitted' }
      : { label: labels.ready, badgeVariant: 'ready' }
  }
  return { label: labels.draft, badgeVariant: 'draft' }
}
