'use server'

import { buildFormalComplaintLetter } from '@/lib/complaints/formal-letter'
import { sanitizeCollectedFields } from '@/lib/complaints/collected-fields'
import { isMeaningfulTitle } from '@/lib/complaints/display'
import { getRequiredFieldsForComplaintType } from '@/lib/ai/missing-fields'
import {
  ComplaintAlreadyExistsError,
  createComplaintRecord,
  createComplaintVersion,
  deleteComplaintRecord,
  generateComplaintReference,
  getComplaintByConversationId,
  getComplaintById,
  getCurrentComplaintVersion,
  markComplaintGenerated,
  markComplaintSubmitted,
} from '@/lib/db/complaints'
import {
  getOwnedConversationTitle,
  getSavedRouting,
  getUserMessageContents,
  setConversationTitle,
} from '@/lib/db/conversations'
import { getProfileFullName } from '@/lib/db/profiles'
import { hydrateSavedRouting } from '@/lib/ai/routing'
import { createClient } from '@/lib/supabase/server'

const CHANGE_SUMMARY_FIRST_VERSION = 'إنشاء النسخة الأولى من البلاغ'

// Every failure branch returns one of these fixed, generic Arabic messages —
// never a raw Postgres/Supabase error body, and never a detail that would
// let a caller distinguish "doesn't exist" from "not yours" for either a
// conversation or a complaint.
const ERROR_UNAUTHENTICATED = 'يجب تسجيل الدخول لإنشاء البلاغ.'
const ERROR_CONVERSATION_NOT_FOUND = 'تعذر العثور على المحادثة أو لا تملك صلاحية الوصول إليها.'
const ERROR_ROUTING_INCOMPLETE = 'لم يتم تحديد الجهة المختصة بشكل كامل بعد لهذه المحادثة.'
const ERROR_PROFILE_NAME_MISSING = 'يجب إضافة الاسم الكامل في الملف الشخصي قبل إنشاء البلاغ.'
const ERROR_ALREADY_EXISTS = 'يوجد بلاغ بالفعل لهذه المحادثة.'
const ERROR_COMPLAINT_NOT_FOUND = 'تعذر العثور على البلاغ أو لا تملك صلاحية الوصول إليه.'
const ERROR_GENERATION_FAILED = 'تعذر إتمام إعداد البلاغ. حاول مرة أخرى.'
const ERROR_UNEXPECTED = 'حدث خطأ غير متوقع. حاول مرة أخرى.'

export type CreateComplaintResult =
  | {
      success: true
      complaint: {
        id: string
        referenceNumber: string
        title: string
        status: string
        submittedAt: string | null
        createdAt: string
        updatedAt: string
        entityName: string
        officialUrl: string
        subject: string
        complaintText: string
      }
    }
  | { success: false; error: string }

/**
 * Creates one real complaint record + its first formal-letter version for the
 * caller's own, already-in-progress complaint conversation. Accepts only
 * `dbConversationId` and `collectedFields` — every other value (user id,
 * entity/service/complaint-type ids, entity name, full name, status,
 * reference number) is derived or re-read server-side from the authenticated
 * session, the owned conversation's saved routing, and the user's own
 * profile. Nothing the client sends is ever trusted as an authoritative id.
 *
 * Security model: the normal authenticated client is used for every read
 * that needs RLS (auth, conversation ownership, saved routing, profile) —
 * the narrow service-role helpers in lib/db/complaints.ts are used only for
 * the complaints/complaint_versions writes those RLS policies don't permit
 * any client role to perform directly (see supabase/migrations/0006).
 */
export async function createComplaintAction(
  dbConversationId: string,
  collectedFields: Record<string, string>,
): Promise<CreateComplaintResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_UNAUTHENTICATED }
    }

    // Four independent reads — none depends on another's result — run
    // concurrently instead of as sequential round trips (Phase 6.7, Part 4).
    // hydrateSavedRouting only ever needs savedRouting (never title or
    // fullName), so it's chained off the savedRouting promise directly and
    // starts as soon as that one read settles, instead of waiting for the
    // slowest of the other reads first. userMessages feeds the narrative
    // rewriter (Phase 7.0) so it reasons over the whole conversation, not
    // just problem_description alone.
    const savedRoutingPromise = getSavedRouting(supabase, dbConversationId, user.id)
    const hydratedRoutingPromise = savedRoutingPromise.then((savedRouting) =>
      savedRouting ? hydrateSavedRouting(supabase, savedRouting) : null,
    )
    // Phase 7.6, Part 5 — the current complaint type's own required_fields
    // keys, used below to drop any stale field collected under a *different*
    // complaint type (e.g. an earlier routing, before an explicit
    // correction) from the letter entirely, rather than let it leak through
    // as an incompatible reference line.
    const requiredFieldsPromise = savedRoutingPromise.then((savedRouting) =>
      savedRouting ? getRequiredFieldsForComplaintType(supabase, savedRouting.complaintTypeId) : [],
    )
    const [title, savedRouting, fullName, userMessages] = await Promise.all([
      getOwnedConversationTitle(supabase, dbConversationId, user.id),
      savedRoutingPromise,
      getProfileFullName(supabase, user.id),
      getUserMessageContents(supabase, dbConversationId),
    ])

    if (title === null) {
      return { success: false, error: ERROR_CONVERSATION_NOT_FOUND }
    }
    if (!savedRouting) {
      return { success: false, error: ERROR_ROUTING_INCOMPLETE }
    }
    if (!fullName) {
      return { success: false, error: ERROR_PROFILE_NAME_MISSING }
    }

    const hydratedRouting = await hydratedRoutingPromise
    if (!hydratedRouting || !hydratedRouting.entityName || !hydratedRouting.officialUrl) {
      return { success: false, error: ERROR_ROUTING_INCOMPLETE }
    }

    const requiredFields = await requiredFieldsPromise
    const relevantFieldKeys = new Set(requiredFields.map((field) => field.key))
    const sanitizedFields = sanitizeCollectedFields(collectedFields, relevantFieldKeys)

    const { subject, complaintText, generatedFromData } = buildFormalComplaintLetter({
      entityName: hydratedRouting.entityName,
      fullName,
      collectedFields: sanitizedFields,
      conversationTitle: title,
      userMessages,
    })

    // Best-effort, non-blocking — never delays returning the complaint result.
    // Only ever upgrades a still-generic title (see Phase 6.7, Part 1); a
    // meaningful title (whether user-set or already auto-upgraded during
    // collection) is never touched.
    if (!isMeaningfulTitle(title)) {
      void setConversationTitle(supabase, dbConversationId, user.id, subject).catch(() => {})
    }

    const referenceNumber = generateComplaintReference()
    let complaintId: string
    let complaintCreatedAt: string
    try {
      const created = await createComplaintRecord({
        conversationId: dbConversationId,
        userId: user.id,
        entityId: savedRouting.entityId,
        serviceId: savedRouting.serviceId,
        complaintTypeId: savedRouting.complaintTypeId,
        referenceNumber,
      })
      complaintId = created.id
      complaintCreatedAt = created.createdAt
    } catch (error) {
      if (error instanceof ComplaintAlreadyExistsError) {
        // A complaint for this conversation already exists — recover and
        // return the real, existing record rather than a bare failure, so a
        // duplicate click (or a retry after a dropped response) still lands
        // the user on their actual complaint instead of a dead end.
        const existing = await getComplaintByConversationId(supabase, dbConversationId, user.id)
        const existingVersion = existing
          ? await getCurrentComplaintVersion(supabase, existing.id)
          : null

        if (existing && existingVersion) {
          return {
            success: true,
            complaint: {
              id: existing.id,
              referenceNumber: existing.referenceNumber,
              title: existing.title,
              status: existing.status,
              submittedAt: existing.submittedAt,
              createdAt: existing.createdAt,
              updatedAt: existing.updatedAt,
              entityName: existing.entityName ?? hydratedRouting.entityName,
              officialUrl: hydratedRouting.officialUrl,
              subject: existingVersion.subject,
              complaintText: existingVersion.complaintText,
            },
          }
        }

        return { success: false, error: ERROR_ALREADY_EXISTS }
      }
      throw error
    }

    let finalizedUpdatedAt: string
    try {
      const version = await createComplaintVersion({
        complaintId,
        complaintText,
        generatedFromData,
        changeSummary: CHANGE_SUMMARY_FIRST_VERSION,
      })
      const finalized = await markComplaintGenerated(complaintId, version.id)
      finalizedUpdatedAt = finalized.updatedAt
    } catch {
      // Never leave a half-finished complaint (no version, no letter) sitting
      // in the user's account — see requirement 9.
      await deleteComplaintRecord(complaintId)
      return { success: false, error: ERROR_GENERATION_FAILED }
    }

    // Built entirely from already-known values — no final re-read of the
    // complaint row (Phase 6.7, Part 4): every field here was either just
    // generated deterministically above, or returned directly by the insert/
    // update calls themselves.
    return {
      success: true,
      complaint: {
        id: complaintId,
        referenceNumber,
        title: isMeaningfulTitle(title) ? title : subject,
        status: 'generated',
        submittedAt: null,
        createdAt: complaintCreatedAt,
        updatedAt: finalizedUpdatedAt,
        entityName: hydratedRouting.entityName,
        officialUrl: hydratedRouting.officialUrl,
        subject,
        complaintText,
      },
    }
  } catch {
    return { success: false, error: ERROR_UNEXPECTED }
  }
}

export type MarkComplaintSubmittedResult =
  { success: true; submittedAt: string; updatedAt: string } | { success: false; error: string }

/**
 * Records that the user submitted their complaint to the authority
 * themselves. Verifies ownership via the authenticated client's RLS-scoped
 * read (`getComplaintById`) before ever touching the service-role write —
 * same precondition-then-write pattern as complaint creation above.
 */
export async function markComplaintSubmittedAction(
  complaintId: string,
): Promise<MarkComplaintSubmittedResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_UNAUTHENTICATED }
    }

    const complaint = await getComplaintById(supabase, complaintId)
    if (!complaint) {
      return { success: false, error: ERROR_COMPLAINT_NOT_FOUND }
    }

    await markComplaintSubmitted(complaintId)

    const updated = await getComplaintById(supabase, complaintId)
    if (!updated || !updated.submittedAt) {
      return { success: false, error: ERROR_UNEXPECTED }
    }

    return { success: true, submittedAt: updated.submittedAt, updatedAt: updated.updatedAt }
  } catch {
    return { success: false, error: ERROR_UNEXPECTED }
  }
}
