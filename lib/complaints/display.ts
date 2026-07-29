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
export function getDisplayTitle(input: DisplayTitleInput): string {
  const title = input.title.trim()
  if (isMeaningfulTitle(title)) return title

  const subject = input.complaintSubject?.trim()
  if (subject) return subject

  const description = input.problemDescription?.trim()
  if (description) return truncateAtWordBoundary(description, MAX_FALLBACK_TITLE_LENGTH)

  return GENERIC_TITLE_FALLBACK
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
export function getComplaintStatusPresentation(
  status: string,
  submittedAt: string | null,
): ComplaintStatusPresentation {
  if (status === 'completed') {
    return { label: 'مكتمل', badgeVariant: 'completed' }
  }
  if (status === 'generated') {
    return submittedAt
      ? { label: 'تم التقديم', badgeVariant: 'submitted' }
      : { label: 'تم الإنشاء', badgeVariant: 'ready' }
  }
  return { label: 'مسودة', badgeVariant: 'draft' }
}
