'use server'

import { ENGLISH_FIELD_LABELS } from '@/lib/ai/server-copy'
import { getRequiredFieldsForComplaintType } from '@/lib/ai/missing-fields'
import { hydrateSavedRouting } from '@/lib/ai/routing'
import { sanitizeCollectedFields } from '@/lib/complaints/collected-fields'
import { isMeaningfulTitle } from '@/lib/complaints/display'
import {
  buildFormalComplaintLetter,
  COMPLAINT_FIELD_LABELS,
  type FormalLetterResult,
} from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'
import {
  getCollectedInformationForConversation,
  saveCollectedFieldAsServiceRole,
} from '@/lib/db/collected-information'
import {
  ComplaintAlreadyExistsError,
  countComplaintVersions,
  createComplaintRecord,
  createComplaintVersion,
  createNextComplaintVersion,
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
import { resolveLocale, type Locale } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const CHANGE_SUMMARY_FIRST_VERSION = 'إنشاء النسخة الأولى من البلاغ'
const CHANGE_SUMMARY_EDITED = 'تعديل بيانات البلاغ وإعادة إنشائه'
const CHANGE_SUMMARY_REGENERATED = 'إعادة إنشاء البلاغ'

const MAX_EDIT_VALUE_LENGTH = 500

// Every failure branch returns one of these fixed, generic messages — never a
// raw Postgres/Supabase error body, and never a detail that would let a
// caller distinguish "doesn't exist" from "not yours" for either a
// conversation or a complaint.
const ERRORS = {
  ar: {
    unauthenticated: 'يجب تسجيل الدخول لإنشاء البلاغ.',
    conversationNotFound: 'تعذر العثور على المحادثة أو لا تملك صلاحية الوصول إليها.',
    routingIncomplete: 'لم يتم تحديد الجهة المختصة بشكل كامل بعد لهذه المحادثة.',
    profileNameMissing: 'يجب إضافة الاسم الكامل في الملف الشخصي قبل إنشاء البلاغ.',
    alreadyExists: 'يوجد بلاغ بالفعل لهذه المحادثة.',
    complaintNotFound: 'تعذر العثور على البلاغ أو لا تملك صلاحية الوصول إليه.',
    generationFailed: 'تعذر إتمام إعداد البلاغ. حاول مرة أخرى.',
    descriptionRequired: 'وصف المشكلة مطلوب لإعادة إنشاء البلاغ.',
    unexpected: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
  },
  en: {
    unauthenticated: 'You need to sign in to create a complaint.',
    conversationNotFound: "The conversation couldn't be found, or you don't have access to it.",
    routingIncomplete: "The responsible authority hasn't been fully identified for this conversation yet.",
    profileNameMissing: 'Please add your full name to your profile before creating a complaint.',
    alreadyExists: 'A complaint already exists for this conversation.',
    complaintNotFound: "The complaint couldn't be found, or you don't have access to it.",
    generationFailed: "The complaint couldn't be prepared. Please try again.",
    descriptionRequired: 'A problem description is required to regenerate the complaint.',
    unexpected: 'Something went wrong. Please try again.',
  },
} satisfies Record<Locale, Record<string, string>>

async function resolveActionLocale(requested: unknown): Promise<Locale> {
  return requested === undefined ? getLocale() : resolveLocale(requested)
}

function buildLetter(
  locale: Locale,
  input: Parameters<typeof buildFormalComplaintLetter>[0],
): FormalLetterResult {
  if (locale === 'en') return buildEnglishFormalComplaintLetter(input)
  const letter = buildFormalComplaintLetter(input)
  return { ...letter, generatedFromData: { language: 'ar', ...letter.generatedFromData } }
}

export type ComplaintPayload = {
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

export type CreateComplaintResult =
  | { success: true; complaint: ComplaintPayload }
  | { success: false; error: string }

/**
 * Creates one real complaint record + its first formal-letter version for the
 * caller's own, already-in-progress complaint conversation. Accepts only
 * `dbConversationId`, `collectedFields` and the interface language — every
 * other value (user id, entity/service/complaint-type ids, entity name, full
 * name, status, reference number) is derived or re-read server-side from the
 * authenticated session, the owned conversation's saved routing, and the
 * user's own profile. Nothing the client sends is trusted as an id.
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
  requestedLocale?: Locale,
): Promise<CreateComplaintResult> {
  const locale = await resolveActionLocale(requestedLocale)
  const errors = ERRORS[locale]
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: errors.unauthenticated }
    }

    // Independent reads run concurrently (Phase 6.7, Part 4).
    const savedRoutingPromise = getSavedRouting(supabase, dbConversationId, user.id)
    const hydratedRoutingPromise = savedRoutingPromise.then((savedRouting) =>
      savedRouting ? hydrateSavedRouting(supabase, savedRouting) : null,
    )
    // Only the current complaint type's own required fields reach the letter
    // (Phase 7.6, Part 5) — a stale field from an earlier routing never does.
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
      return { success: false, error: errors.conversationNotFound }
    }
    if (!savedRouting) {
      return { success: false, error: errors.routingIncomplete }
    }
    if (!fullName) {
      return { success: false, error: errors.profileNameMissing }
    }

    const hydratedRouting = await hydratedRoutingPromise
    if (!hydratedRouting || !hydratedRouting.entityName || !hydratedRouting.officialUrl) {
      return { success: false, error: errors.routingIncomplete }
    }

    const requiredFields = await requiredFieldsPromise
    const relevantFieldKeys = new Set(requiredFields.map((field) => field.key))
    const sanitizedFields = sanitizeCollectedFields(collectedFields, relevantFieldKeys)

    const { subject, complaintText, generatedFromData } = buildLetter(locale, {
      entityName: hydratedRouting.entityName,
      fullName,
      collectedFields: sanitizedFields,
      conversationTitle: title,
      userMessages,
    })

    // Best-effort, non-blocking — only ever upgrades a still-generic title.
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
        // A duplicate click (or a retry after a dropped response) recovers
        // the real, existing record instead of creating a second one.
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

        return { success: false, error: errors.alreadyExists }
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
      // Never leave a half-finished complaint (no version, no letter) behind.
      await deleteComplaintRecord(complaintId)
      return { success: false, error: errors.generationFailed }
    }

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
    return { success: false, error: errors.unexpected }
  }
}

export type ComplaintEditableField = {
  key: string
  label: string
  value: string
  required: boolean
  multiline: boolean
}

export type GetComplaintEditDataResult =
  | { success: true; fields: ComplaintEditableField[]; versionCount: number }
  | { success: false; error: string }

/**
 * The complaint's editable details: the required fields of its complaint
 * type, pre-filled from collected_information. Read entirely through the
 * caller's RLS-scoped client, so a foreign complaint id simply isn't found.
 */
export async function getComplaintEditDataAction(
  complaintId: string,
  requestedLocale?: Locale,
): Promise<GetComplaintEditDataResult> {
  const locale = await resolveActionLocale(requestedLocale)
  const errors = ERRORS[locale]
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: errors.unauthenticated }

    const complaint = await getComplaintById(supabase, complaintId)
    if (!complaint) return { success: false, error: errors.complaintNotFound }

    const savedRouting = await getSavedRouting(supabase, complaint.conversationId, user.id)
    if (!savedRouting) return { success: false, error: errors.routingIncomplete }

    const [requiredFields, values, versionCount] = await Promise.all([
      getRequiredFieldsForComplaintType(supabase, savedRouting.complaintTypeId),
      getCollectedInformationForConversation(supabase, complaint.conversationId),
      countComplaintVersions(supabase, complaintId),
    ])

    const keys = requiredFields.length > 0 ? requiredFields : [{ key: 'problem_description', required: true }]
    const fields = keys.map((field) => ({
      key: field.key,
      label:
        locale === 'en'
          ? (ENGLISH_FIELD_LABELS[field.key] ?? field.key)
          : (COMPLAINT_FIELD_LABELS[field.key] ?? field.key),
      value: values[field.key] ?? '',
      required: Boolean(field.required),
      multiline: field.key === 'problem_description',
    }))

    return { success: true, fields, versionCount }
  } catch {
    return { success: false, error: errors.unexpected }
  }
}

export type UpdateComplaintResult =
  | {
      success: true
      complaint: Pick<ComplaintPayload, 'subject' | 'complaintText' | 'updatedAt' | 'status'>
      versionNumber: number
    }
  | { success: false; error: string }

/**
 * Saves corrected details (optional) and regenerates the formal letter as a
 * new version of the same complaint — never a second complaint. Previous
 * versions stay in complaint_versions as history.
 *
 * Ownership is established with the caller's RLS-scoped client before any
 * service-role write happens. Only the complaint type's own required field
 * keys are accepted, values are trimmed and capped, and the problem
 * description can't be blanked out.
 */
export async function updateComplaintAction(
  complaintId: string,
  editedFields: Record<string, string> | null,
  requestedLocale?: Locale,
): Promise<UpdateComplaintResult> {
  const locale = await resolveActionLocale(requestedLocale)
  const errors = ERRORS[locale]
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: errors.unauthenticated }

    const complaint = await getComplaintById(supabase, complaintId)
    if (!complaint) return { success: false, error: errors.complaintNotFound }

    const conversationId = complaint.conversationId
    const savedRouting = await getSavedRouting(supabase, conversationId, user.id)
    if (!savedRouting) return { success: false, error: errors.routingIncomplete }

    const [hydratedRouting, requiredFields, existingValues, fullName, title, userMessages] =
      await Promise.all([
        hydrateSavedRouting(supabase, savedRouting),
        getRequiredFieldsForComplaintType(supabase, savedRouting.complaintTypeId),
        getCollectedInformationForConversation(supabase, conversationId),
        getProfileFullName(supabase, user.id),
        getOwnedConversationTitle(supabase, conversationId, user.id),
        getUserMessageContents(supabase, conversationId),
      ])

    if (!hydratedRouting?.entityName) return { success: false, error: errors.routingIncomplete }
    if (!fullName) return { success: false, error: errors.profileNameMissing }

    const allowedKeys = new Set(
      requiredFields.length > 0 ? requiredFields.map((field) => field.key) : ['problem_description'],
    )

    const changes: Record<string, string> = {}
    if (editedFields && typeof editedFields === 'object') {
      for (const [key, rawValue] of Object.entries(editedFields)) {
        if (!allowedKeys.has(key) || typeof rawValue !== 'string') continue
        const value = rawValue.trim().slice(0, MAX_EDIT_VALUE_LENGTH)
        if (value === (existingValues[key] ?? '')) continue
        if (value === '') continue
        changes[key] = value
      }
    }

    const mergedValues = { ...existingValues, ...changes }
    if (!mergedValues.problem_description?.trim()) {
      return { success: false, error: errors.descriptionRequired }
    }

    // Persist corrected details first, so the conversation's record matches
    // the letter. Ownership was verified above (RLS read of the complaint).
    for (const [fieldKey, fieldValue] of Object.entries(changes)) {
      await saveCollectedFieldAsServiceRole(conversationId, { fieldKey, fieldValue })
    }

    const sanitizedFields = sanitizeCollectedFields(mergedValues, allowedKeys)
    // When the description itself changed, the letter must follow the new
    // text — the earlier chat messages no longer describe the case.
    const descriptionChanged = 'problem_description' in changes
    const letter = buildLetter(locale, {
      entityName: hydratedRouting.entityName,
      fullName,
      collectedFields: sanitizedFields,
      conversationTitle: title ?? undefined,
      userMessages: descriptionChanged ? [] : userMessages,
    })

    const version = await createNextComplaintVersion({
      complaintId,
      complaintText: letter.complaintText,
      generatedFromData: letter.generatedFromData,
      changeSummary:
        Object.keys(changes).length > 0 ? CHANGE_SUMMARY_EDITED : CHANGE_SUMMARY_REGENERATED,
    })

    return {
      success: true,
      complaint: {
        subject: letter.subject,
        complaintText: letter.complaintText,
        updatedAt: version.updatedAt,
        status: 'generated',
      },
      versionNumber: version.versionNumber,
    }
  } catch {
    return { success: false, error: errors.unexpected }
  }
}

export type MarkComplaintSubmittedResult =
  | { success: true; submittedAt: string; updatedAt: string }
  | { success: false; error: string }

/**
 * Records that the user submitted their complaint to the authority
 * themselves. Verifies ownership via the authenticated client's RLS-scoped
 * read (`getComplaintById`) before ever touching the service-role write.
 */
export async function markComplaintSubmittedAction(
  complaintId: string,
  requestedLocale?: Locale,
): Promise<MarkComplaintSubmittedResult> {
  const locale = await resolveActionLocale(requestedLocale)
  const errors = ERRORS[locale]
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: errors.unauthenticated }
    }

    const complaint = await getComplaintById(supabase, complaintId)
    if (!complaint) {
      return { success: false, error: errors.complaintNotFound }
    }

    await markComplaintSubmitted(complaintId)

    const updated = await getComplaintById(supabase, complaintId)
    if (!updated || !updated.submittedAt) {
      return { success: false, error: errors.unexpected }
    }

    return { success: true, submittedAt: updated.submittedAt, updatedAt: updated.updatedAt }
  } catch {
    return { success: false, error: errors.unexpected }
  }
}
