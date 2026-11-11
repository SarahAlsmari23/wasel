import { NextResponse } from 'next/server'
import { validateChatRequest } from '@/lib/ai/contracts'
import { AiProviderError } from '@/lib/ai/generation-shared'
import { generateAnswer } from '@/lib/ai/provider'
import { allowsRouting, assessIntent } from '@/lib/ai/intent'
import { getAuthorityProfile, profilePromptBlock } from '@/lib/government/profiles'
import { scrubUnverifiedContacts } from '@/lib/government/contact-check'
import {
  describesProblem,
  isInformationQuestion,
  isOnlyComplaintRequest,
} from '@/lib/ai/problem-signal'
import {
  localizedFieldQuestion,
  SERVER_COPY,
  subtypeClarificationQuestion,
} from '@/lib/ai/server-copy'
import { LOCALE_COOKIE, resolveLocale, type Locale } from '@/lib/i18n/config'
import { checkRateLimits, clientIpFrom } from '@/lib/security/rate-limit'
import {
  buildKnownFieldKeysFromComplaintContext,
  type MissingFieldsResult,
} from '@/lib/ai/missing-fields'
import { buildPrompt } from '@/lib/ai/prompts'
import { entityDisplayName } from '@/lib/mock/government-entities'
import { getCollectedInformationForConversation } from '@/lib/db/collected-information'
import { getSavedRouting, updateConversationRouting } from '@/lib/db/conversations'
import {
  hydrateSavedRouting,
  mergeRouting,
  resolveRouting,
  resolveRoutingByEntityName,
} from '@/lib/ai/routing'
import {
  detectSectorByKeyword,
  getEntityNameForSector,
  hasCorrectionMarker,
} from '@/lib/ai/entity-detection'
import { sanitizeComplaintContext, sanitizeHistory, sanitizeMessage } from '@/lib/ai/sanitize'
import { retrieveRelevantDocuments, RetrievalError } from '@/lib/rag/retrieve'
import type { RetrievedDocument } from '@/lib/rag/types'
import { createClient } from '@/lib/supabase/server'
import { ENTITY_NAME_TO_SECTOR } from '@/lib/complaints/sectors'
import { hasSectorIssueSignal } from '@/lib/complaints/issue-signal'
import { loadComplaintCollectionState } from '@/lib/wasal/conversation-state'
import { isExplicitRoutingChange, wantsToCreateComplaint } from '@/lib/wasal/complaint-intent'
import {
  appendPendingQuestion,
  coerceModelIntent,
  hasGrievanceSignal,
  isComplaintIntent,
  isGreetingOnly,
  isIdentityQuestion,
  isInformationalIntent,
  isLikelySideQuestion,
  isObviousOutOfScope,
} from '@/lib/ai/intent-guards'
import type {
  ChatComplaintContext,
  ChatErrorResponse,
  ChatIntent,
  ChatRouting,
  ChatSource,
  ChatSuccessResponse,
} from '@/types/ai'

// Server-authored messages (completion notice, validation retry, fixed
// greeting/identity/out-of-scope replies, errors) live in
// lib/ai/server-copy.ts in both languages.

const RATE_LIMIT_WINDOW_MS = 60_000
// Signed-in users are keyed by account. Guests are keyed per conversation
// AND per IP: the per-conversation budget keeps one visitor from hammering
// the model, while the much looser per-IP ceiling still bounds abuse without
// letting several people behind one shared network (a venue, an office)
// exhaust each other's budget.
const RATE_LIMIT_AUTHENTICATED = 15
const RATE_LIMIT_GUEST_CONVERSATION = 10
const RATE_LIMIT_GUEST_IP = 40

/** Opt-in verbose pipeline tracing (CHAT_DEBUG_LOGS=true). Structural only —
 * never message content, prompts, identifiers or provider error bodies. */
function debugLog(line: string) {
  if (process.env.CHAT_DEBUG_LOGS === 'true') debugLog(line)
}

function localeFromCookie(request: Request): Locale {
  const match = request.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`))
  return resolveLocale(match?.[1])
}

function errorResponse(error: string, status: number) {
  return NextResponse.json<ChatErrorResponse>({ error }, { status })
}

/**
 * A fully deterministic, server-authored response — used for identity and
 * out-of-scope classifications (Phase 7.1, Parts 5/6). Never carries RAG
 * sources, routing, or complaint-collection state: none of those concepts
 * apply once the message has been classified this way.
 */
function fixedIntentResponse(intent: ChatIntent, answer: string): ChatSuccessResponse {
  return {
    answer,
    intent,
    confidence: 'high',
    grounded: intent === 'identity_question',
    missingFields: [],
    suggestedQuestions: [],
    sources: [],
    routing: null,
    nextQuestion: null,
    nextFieldKey: null,
    readyToGenerateComplaint: false,
    routingPersisted: false,
  }
}

// TEMPORARY DIAGNOSTICS — structural only. Never logs secrets, prompts,
// embeddings, document content, raw provider/database errors, or stack
// traces. RetrievalError/AiProviderError messages are already generic,
// internal-only strings by design (defined in lib/rag/retrieve.ts and
// lib/ai/cloudflare.ts respectively) — safe to log as-is. Remove after this
// diagnostic pass.
function categorizeRetrievalFailure(error: unknown): string {
  if (error instanceof RetrievalError) return error.message
  return error instanceof Error ? error.name : typeof error
}

function categorizeGenerationFailure(error: unknown): string {
  if (error instanceof AiProviderError) return error.message
  return error instanceof Error ? error.name : typeof error
}

function categorizeRoutingFailure(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

function categorizeMissingFieldsFailure(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

// Emergency Fix — electricity-complaint root cause, defense-in-depth: with
// no explicit budget, this route inherited Vercel's platform default
// serverless function duration, which is tighter than the AI provider's own
// internal timeout (Gemini/OpenAI: 20s — see GENERATE_TIMEOUT_MS in
// lib/ai/gemini.ts / lib/ai/openai.ts). A legitimately slow-but-successful
// generation call could therefore be killed by the platform itself before
// the AI provider's own timeout ever had a chance to fire, surfacing to the
// client as an opaque network failure indistinguishable from a real outage.
// 30s gives the full retrieval+routing+missing-fields pipeline (typically
// under 2s, confirmed via [chat] timing logs) plus the provider's own 20s
// ceiling room to complete normally. The primary fix for the reported bug is
// below (skipping the model call entirely once the answer is already
// deterministic) — this export only hardens the remaining, genuinely
// model-dependent turns.
export const maxDuration = 45

export async function POST(request: Request) {
  const requestStart = Date.now()
  const cookieLocale = localeFromCookie(request)

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(SERVER_COPY[cookieLocale].errors.invalidRequest, 400)
  }

  const validation = validateChatRequest(payload, cookieLocale)
  if (!validation.valid) {
    return errorResponse(validation.error, 400)
  }

  const {
    message,
    history,
    intent,
    complaintContext,
    dbConversationId,
    activeEntityName,
    conversationId: clientConversationId,
  } = validation.value
  const locale: Locale = validation.value.locale ?? cookieLocale
  const sc = SERVER_COPY[locale]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The assistant is open to guests by design — asking general questions
  // never requires an account. Only complaint creation and persistence are
  // gated, and neither happens here.
  const rateLimit = await checkRateLimits(
    user
      ? [
          {
            key: `user:${user.id}`,
            limit: RATE_LIMIT_AUTHENTICATED,
            windowMs: RATE_LIMIT_WINDOW_MS,
          },
        ]
      : [
          {
            key: `guest-conv:${clientConversationId.slice(0, 64)}`,
            limit: RATE_LIMIT_GUEST_CONVERSATION,
            windowMs: RATE_LIMIT_WINDOW_MS,
          },
          {
            key: `guest-ip:${clientIpFrom(request)}`,
            limit: RATE_LIMIT_GUEST_IP,
            windowMs: RATE_LIMIT_WINDOW_MS,
          },
        ],
  )
  if (!rateLimit.allowed) {
    return errorResponse(sc.errors.rateLimited, 429)
  }

  const sanitizedMessage = sanitizeMessage(message)

  // Phase 7.1/7.2 — deterministic, server-authoritative intent guards.
  //
  // `hasActiveComplaintContext` is the one signal that changes everything
  // below: it's true exactly when the client is inside its complaint-builder
  // flow (runComplaintTurn always sends a `complaintContext`, even an empty
  // one, general-assistant turns never do). Phase 7.1 treated any message
  // arriving with intent='complaint_guidance' as automatically
  // complaint_guidance, full stop — which is exactly what let a side
  // question ("كم مدة الرد على الشكوى؟") or an out-of-scope aside get
  // silently swallowed as an answer to the pending field (Phase 7.2's
  // verified issues #4/#5). Now: a message with active complaint context is
  // never short-circuited here (no RAG-free early return) — it always
  // proceeds to RAG/routing/missing-fields first, so the *real* pending
  // field is known, and only then is it classified as a genuine answer, an
  // explicit create-complaint trigger, or an interruption (identity /
  // out-of-scope / complaint_side_question) that must answer briefly and
  // resume the exact same pending question afterward (see
  // `complaintInterruption` below). Only a message with NO active complaint
  // context at all can still take the cheap, RAG-free identity/out-of-scope
  // shortcut — that part of Phase 7.1's behavior is unchanged.
  const hasActiveComplaintContext = complaintContext !== undefined
  const explicitCreateComplaint = wantsToCreateComplaint(sanitizedMessage)
  const grievanceSignal = hasGrievanceSignal(sanitizedMessage)
  // Phase 7.7, Part 4 — a message naming one of the fixed, unambiguous
  // sector keywords ("الموية"/"المياه", "متجر", …) is complaint-relevant
  // regardless of whether the separate grievance-tone wordlist above happens
  // to also match — an obvious entity mention is its own sufficient signal,
  // never dependent on also guessing every possible grievance verb form.
  const keywordSector = detectSectorByKeyword(sanitizedMessage)
  const assessment = assessIntent(sanitizedMessage)
  const likelyComplaint =
    hasActiveComplaintContext ||
    intent === 'complaint_guidance' ||
    intent === 'create_complaint' ||
    intent === 'complaint_side_question' ||
    explicitCreateComplaint ||
    // Intent-first (lib/ai/intent.ts): a stated service problem, or a problem
    // whose service is still unknown. A sector word alone is not enough
    // (production defect: «كيف اقدر اسوي كبسة من الموية» started a water
    // complaint), and an everyday topic never counts.
    (grievanceSignal && assessment.kind !== 'out_of_scope') ||
    assessment.kind === 'complaint' ||
    assessment.kind === 'ambiguous_problem'
  // A service inquiry is governmental (no shortcut, may be routed) but does
  // not start complaint collection by itself.
  const governmental = likelyComplaint || assessment.kind === 'service_inquiry'
  // Fresh authority selection needs governmental evidence (or an active
  // complaint, whose own state machine decides).
  const freshRoutingAllowed = hasActiveComplaintContext || allowsRouting(assessment.kind)

  // An everyday topic or an injection attempt outside a complaint flow gets
  // the fixed scope answer — no retrieval, no authority, no model call —
  // unless the user explicitly asked to create a complaint.
  if (
    !hasActiveComplaintContext &&
    assessment.kind === 'out_of_scope' &&
    !explicitCreateComplaint
  ) {
    debugLog(`[chat] intent out_of_scope reasons=${assessment.reasons.join(',')}`)
    return NextResponse.json<ChatSuccessResponse>(
      fixedIntentResponse('out_of_scope', sc.outOfScope),
      { status: 200 },
    )
  }
  if (!hasActiveComplaintContext && !governmental) {
    if (isGreetingOnly(sanitizedMessage)) {
      return NextResponse.json<ChatSuccessResponse>(fixedIntentResponse('greeting', sc.greeting), {
        status: 200,
      })
    }
    if (isIdentityQuestion(sanitizedMessage)) {
      return NextResponse.json<ChatSuccessResponse>(
        fixedIntentResponse('identity_question', sc.identity),
        { status: 200 },
      )
    }
    if (isObviousOutOfScope(sanitizedMessage)) {
      return NextResponse.json<ChatSuccessResponse>(
        fixedIntentResponse('out_of_scope', sc.outOfScope),
        { status: 200 },
      )
    }
  }

  // Retrieval is non-fatal: a failure or timeout here must never surface to
  // the user or block the chat response — it just falls back to no
  // retrieved context, same as before RAG existed.
  debugLog('[chat] retrieval-start')
  const retrievalStart = Date.now()
  let retrievedDocuments: RetrievedDocument[] = []
  let retrievalMs = 0
  try {
    retrievedDocuments = await retrieveRelevantDocuments(sanitizedMessage)
    retrievalMs = Date.now() - retrievalStart
    debugLog(
      `[chat] retrieval-success count=${retrievedDocuments.length} elapsedMs=${Date.now() - retrievalStart}`,
    )
  } catch (error) {
    retrievedDocuments = []
    retrievalMs = Date.now() - retrievalStart
    debugLog(
      `[chat] retrieval-fallback category=${categorizeRetrievalFailure(error)} elapsedMs=${Date.now() - retrievalStart}`,
    )
  }

  // Routing is resolved purely from retrievedDocuments (real, DB-backed
  // ids only — no model call happens here) and is non-fatal, same as
  // retrieval itself: a failure here must never block the chat response.
  debugLog('[chat] routing-start')
  const routingStart = Date.now()
  let routing: ChatRouting | null = null
  // No governmental evidence yet ("unclear"): retrieval may still suggest an
  // authority, but it is only shown if the model also treats the message as
  // governmental and the match is highly confident (checked after
  // generation). It never drives complaint collection or persistence.
  let deferredRouting: ChatRouting | null = null
  try {
    routing = await resolveRouting(supabase, retrievedDocuments)
    if (!freshRoutingAllowed) {
      deferredRouting =
        (assessment.kind === 'unclear' || assessment.kind === 'ambiguous_problem') &&
        routing?.confidence === 'high'
          ? routing
          : null
      routing = null
    }
    debugLog(
      `[chat] routing-${routing ? 'resolved' : 'null'} elapsedMs=${Date.now() - routingStart}`,
    )
  } catch (error) {
    routing = null
    debugLog(
      `[chat] routing-fallback category=${categorizeRoutingFailure(error)} elapsedMs=${Date.now() - routingStart}`,
    )
  }

  // Phase 7.7, Part 4 — a message can name its sector completely
  // unambiguously ("انقطعت عني الموية وأنا دافع الفاتورة") while still not
  // retrieving a strongly-similar knowledge document (RAG similarity is not
  // the same thing as topic certainty) — this deterministic keyword fallback
  // only ever engages when RAG itself didn't produce a usable match
  // (`routing` is null or 'low' confidence), and never overrides a
  // trustworthy RAG result. Non-fatal, same as retrieval/routing above.
  // Only on governmental evidence: the assessed sector (a sector word with
  // an issue or service context, or a named authority), never a bare word.
  const evidenceSector = freshRoutingAllowed
    ? (assessment.sector ?? (hasActiveComplaintContext ? keywordSector : null))
    : null
  if ((!routing || routing.confidence === 'low') && evidenceSector) {
    try {
      const keywordRouting = await resolveRoutingByEntityName(
        supabase,
        getEntityNameForSector(evidenceSector),
      )
      if (keywordRouting) {
        routing = keywordRouting
        debugLog('[chat] routing-resolved-by-keyword')
      }
    } catch (error) {
      debugLog(`[chat] routing-keyword-fallback-failed category=${categorizeRoutingFailure(error)}`)
    }
  }

  // Authority continuity. A follow-up question ("can I track it online?")
  // carries no sector words of its own, so routing it on its own wording
  // alone lands on whichever knowledge document happens to be nearest —
  // which is how a water conversation could suddenly announce the telecom
  // regulator. When the client reports the authority already shown in this
  // conversation, that authority is kept unless this message itself
  // justifies a change: an explicit correction / new-complaint request, or an
  // unambiguous keyword naming a *different* supported sector. The hint is
  // only honoured for one of the known supported authorities and is always
  // re-resolved from the database — never trusted as an id.
  //
  // A bare mention of another sector is not new information: "can I follow
  // my request up via the internet?" names the telecom keyword "الإنترنت"
  // while still being about the same water complaint — exactly the
  // production case that switched to CST. A different sector only wins when
  // the message also describes a problem (grievance / complaint signal).
  if (
    activeEntityName &&
    ENTITY_NAME_TO_SECTOR[activeEntityName] &&
    // An everyday topic never re-routes — but inside an active complaint the
    // complaint's own authority is kept, so the message is handled as an
    // interruption of the pending question.
    (assessment.kind !== 'out_of_scope' || hasActiveComplaintContext)
  ) {
    const keywordEntityName = keywordSector ? getEntityNameForSector(keywordSector) : null
    const describesNewProblemElsewhere =
      keywordEntityName !== null &&
      keywordEntityName !== activeEntityName &&
      // A self-correction ("لا قصدي الموية مو الكهربا", "I mean the water")
      // naming another sector is new information too (evals SEC-032: the
      // reply understood the correction but the authority stayed unchanged).
      (describesProblem(sanitizedMessage) || hasCorrectionMarker(sanitizedMessage))
    const newInformationJustifiesChange =
      isExplicitRoutingChange(sanitizedMessage) || describesNewProblemElsewhere
    if (!newInformationJustifiesChange && routing?.entityName !== activeEntityName) {
      try {
        const continuedRouting = await resolveRoutingByEntityName(supabase, activeEntityName)
        if (continuedRouting) {
          routing = continuedRouting
          debugLog('[chat] routing-continued-from-active-authority')
        }
      } catch {
        // Non-fatal — fall back to this turn's fresh routing.
      }
    }
  }

  // Without governmental evidence and without an authority already in this
  // conversation, retrieved passages are not context for this message: the
  // model answers generally and no official link or source is shown, unless
  // retrieval found a highly confident match (deferredRouting, re-checked
  // against the model's own reading after generation).
  if (!routing && !freshRoutingAllowed && !deferredRouting) {
    retrievedDocuments = []
  }

  // Phase 4D.1 — persist and reuse routing across turns. Only ever keyed by
  // dbConversationId (the real, server-created conversations.id row) — never
  // the client-only conversationId UUID, which has no corresponding row and
  // must never be treated as one. Absent dbConversationId (guest, or the
  // authenticated opening-save hasn't succeeded yet), this entire block is
  // skipped and routing stays exactly the fresh, per-turn value above —
  // identical to today's behavior. Non-fatal: any failure here falls back to
  // the fresh routing, same as retrieval/routing itself.
  // routingPersisted (Phase 6.6F) is a purely honest, additive UI signal —
  // true only once routing is *confirmed* persisted on the owned DB
  // conversation (either just-written successfully this turn, or already
  // saved and reloaded). createComplaintAction still independently re-reads
  // saved routing as the real security authority regardless of this flag.
  let routingPersisted = false
  if (user && dbConversationId) {
    try {
      const freshRouting = routing
      const savedIds = await getSavedRouting(supabase, dbConversationId, user.id)
      const hydratedSaved = savedIds ? await hydrateSavedRouting(supabase, savedIds) : null
      // Phase 7.4B, Part 1 — a saved routing is only ever displaced by a
      // fresh one when this turn's own message is an explicit correction or
      // an explicit request for a new/separate complaint
      // (isExplicitRoutingChange). `grievanceSignal` (a bare mention of
      // "شكوى"/"بلاغ"/"مشكلة") was tried in Phase 7.4 and found too broad:
      // ordinary continuation phrases ("خل نكمل على الشكوى", "نرجع للبلاغ")
      // mention those same words without expressing any new information,
      // which let a filler word silently re-open routing mid-complaint.
      routing = mergeRouting(freshRouting, hydratedSaved, isExplicitRoutingChange(sanitizedMessage))

      const freshIsTrustworthy = Boolean(
        freshRouting && freshRouting.confidence !== 'low' && freshRouting.entityId,
      )
      if (routing === freshRouting && freshIsTrustworthy && freshRouting) {
        await updateConversationRouting(supabase, dbConversationId, user.id, {
          entityId: freshRouting.entityId,
          serviceId: freshRouting.serviceId,
          complaintTypeId: freshRouting.complaintTypeId,
        })
        // Only reached once the write (with its own bounded retry) actually
        // succeeded — a thrown error skips this line and routingPersisted
        // stays false.
        routingPersisted = true
      } else if (routing === hydratedSaved && hydratedSaved) {
        // Reusing an already-saved routing decision — its very presence here
        // proves it was persisted successfully on an earlier turn.
        routingPersisted = true
      }
    } catch (error) {
      debugLog(`[chat] saved-routing-fallback category=${categorizeRoutingFailure(error)}`)
    }
  }

  const sanitizedComplaintContext = sanitizeComplaintContext(complaintContext)

  // Missing-field detection only activates once routing has resolved a real
  // complaintTypeId — required_fields is looked up from complaint_types
  // itself (public-read, same client, no service-role) and drives the
  // result deterministically; the model never sees the full required_fields
  // list and never decides what's missing — only the single selected
  // field's label/hint is ever exposed to it (below). Non-fatal, same as
  // retrieval and routing above.
  debugLog('[chat] missing-fields-start')
  const missingFieldsStart = Date.now()
  let missingFieldsResult: MissingFieldsResult | null = null
  let nextFieldHint: string | null = null
  // Phase 7.1: never runs at all for a message that isn't at least plausibly
  // complaint-related (Part 2 — an informational question must never surface
  // missingFields/nextFieldKey, and must never spend a query building state
  // for a collection flow it was never part of).
  //
  // Phase 8, Part 1/16 — the actual computation (required_fields lookup,
  // known-key merge, computeMissingFields, clarification hint) now lives in
  // one shared function (lib/wasal/conversation-state.ts) instead of being
  // duplicated here and in app/wasal/page.tsx's resume path. Database state
  // (collected_information) is still the only durable source of truth;
  // `buildKnownFieldKeysFromComplaintContext` only ever adds *this turn's*
  // own client-sent answer on top of it, never in place of it.
  // Emergency release fix, Part 2 — the hard duplicate-question invariant:
  // once true, the same required field must never be handed back as
  // `nextField` on the very turn that just supplied a genuine answer for it.
  let duplicateInvariantViolated = false
  // Outside the complaint builder, a message that itself describes a problem
  // *is* the problem description — the next question must move on (e.g. to
  // the city) rather than ask the user to describe what they just described.
  const knownFieldKeysThisTurn = (): Set<string> => {
    const known = buildKnownFieldKeysFromComplaintContext(sanitizedComplaintContext)
    if (
      !hasActiveComplaintContext &&
      assessment.kind === 'complaint' &&
      describesProblem(sanitizedMessage)
    ) {
      known.add('problem_description')
    }
    return known
  }
  if (likelyComplaint && routing?.complaintTypeId) {
    try {
      const persistedFields =
        user && dbConversationId
          ? await getCollectedInformationForConversation(supabase, dbConversationId)
          : {}
      let collectionState = await loadComplaintCollectionState(
        supabase,
        routing.complaintTypeId,
        persistedFields,
        knownFieldKeysThisTurn(),
      )

      const answeredFieldKey = sanitizedComplaintContext?.answeredFieldKey
      const answeredValue = answeredFieldKey
        ? sanitizedComplaintContext?.collectedFields?.[answeredFieldKey]
        : undefined
      if (
        collectionState &&
        answeredFieldKey &&
        answeredValue?.trim() &&
        collectionState.missing.nextField?.key === answeredFieldKey
      ) {
        // The client believes it just answered exactly the field the server
        // is about to ask for again — reload collected_information fresh
        // (in case an earlier read in this same request raced a concurrent
        // write) and recompute once more before concluding anything.
        debugLog('[chat] duplicate-invariant-check reload')
        const freshPersistedFields =
          user && dbConversationId
            ? await getCollectedInformationForConversation(supabase, dbConversationId)
            : {}
        const freshState = await loadComplaintCollectionState(
          supabase,
          routing.complaintTypeId,
          freshPersistedFields,
          knownFieldKeysThisTurn(),
        )
        if (freshState) collectionState = freshState

        if (collectionState.missing.nextField?.key === answeredFieldKey) {
          // Still the same field after a fresh reload — the answer was
          // never actually persisted (a genuine validation/persistence
          // failure on the client's side, not a stale read here). Flagged
          // so the response can say so plainly instead of silently
          // repeating the exact same question a second time.
          duplicateInvariantViolated = true
          debugLog('[chat] duplicate-invariant-violated')
        }
      }

      if (collectionState) {
        missingFieldsResult = collectionState.missing
        nextFieldHint = collectionState.nextFieldHint

        debugLog(
          `[chat] missing-fields-resolved missingCount=${collectionState.missing.missingFields.length} ready=${collectionState.missing.readyToGenerateComplaint} elapsedMs=${Date.now() - missingFieldsStart}`,
        )
      }
    } catch (error) {
      missingFieldsResult = null
      debugLog(
        `[chat] missing-fields-fallback category=${categorizeMissingFieldsFailure(error)} elapsedMs=${Date.now() - missingFieldsStart}`,
      )
    }
  } else {
    debugLog(
      `[chat] missing-fields-skipped reason=${likelyComplaint ? 'no-complaint-type-id' : 'non-complaint-intent'}`,
    )
  }

  // Deterministic state-block guard (Phase 6.10, Part 6): the model gets
  // conversational awareness of every field already answered — with an
  // explicit instruction never to ask for them again — plus exactly one
  // field to ask about next. Never the full required_fields list, and the
  // field *selection* itself stays 100% server-side (computeMissingFields
  // above); this only ever affects the model's phrasing of the one question
  // the server already decided on. Folded into the existing `description`
  // slot (as plain text) so lib/ai/prompts.ts needs no changes; the raw
  // collectedFields object itself never reaches buildPrompt.
  const nextField = missingFieldsResult?.nextField ?? null
  // The exact, already-deterministic pending-question text (Phase 4C) — the
  // one and only text ever used to resume a pending complaint field after an
  // interruption (Phase 7.2, Parts 4/6/8). Never re-derived or re-phrased.
  const pendingQuestionText =
    nextField && missingFieldsResult?.nextQuestion
      ? localizedFieldQuestion(nextField.key, missingFieldsResult.nextQuestion, locale)
      : null

  // Phase 7.2, Part 4/5/7 — is this message actually an interruption (an
  // identity question, an obvious out-of-scope aside, or a relevant side
  // question) rather than a genuine answer to the pending field? The client
  // already runs this same exact check (lib/ai/intent-guards.ts) before ever
  // deciding whether to merge the message into collectedFields; when a real
  // pending field is known here too (routing resolved, whether freshly or
  // via saved-routing hydration), the server independently re-derives the
  // same answer against the *real* resolved field — server remains
  // authoritative, never a blind trust of the client's own label (Phase
  // 6.10B/7.1 precedent). Priority mirrors Part 7: identity's exact-fixed-
  // text requirement is absolute, so it's checked first; out-of-scope's
  // blocklist is next; the broad side-question net (any question shape) is
  // the catch-all.
  //
  // Guest sessions never persist routing across turns (Phase 4D.1 only
  // hydrates saved routing for an authenticated dbConversationId) — an
  // interruption message that doesn't itself semantically match the
  // complaint's topic (e.g. "عطني وصفة كيك" mid-municipal-complaint) then
  // resolves no fresh routing either, so `nextField` can be unknown even
  // though a complaint is genuinely active. In that narrow case the client's
  // own determination (made against its correctly-persisted pendingFieldKey)
  // is trusted rather than silently falling through to the model — an
  // accepted, documented limitation: the interruption itself is still
  // handled correctly, only the deterministic "resume" question text is
  // unavailable (pendingQuestionText stays null below), so the reply
  // answers the interruption without a resume line rather than fabricating
  // one.
  const complaintInterruption:
    'identity_question' | 'out_of_scope' | 'greeting' | 'complaint_side_question' | null =
    !hasActiveComplaintContext
      ? null
      : nextField
        ? isGreetingOnly(sanitizedMessage)
          ? 'greeting'
          : isIdentityQuestion(sanitizedMessage)
            ? 'identity_question'
            : isObviousOutOfScope(sanitizedMessage) || assessment.kind === 'out_of_scope'
              ? 'out_of_scope'
              : // A problem description that ends in a question ("الفاتورة
                // ارتفعت … وين أشتكي؟") answers the pending description — it
                // is not a side question (otherwise the description is lost
                // and the next answer, e.g. the city, is stored in its place).
                nextField.key === 'problem_description' && describesProblem(sanitizedMessage)
                ? null
                : intent === 'complaint_side_question' ||
                    isLikelySideQuestion(sanitizedMessage, nextField.key)
                  ? 'complaint_side_question'
                  : null
        : intent === 'identity_question' ||
            intent === 'out_of_scope' ||
            intent === 'greeting' ||
            intent === 'complaint_side_question'
          ? intent
          : null

  // Identity/out-of-scope/greeting during an active complaint never need a
  // model call at all — same fixed text as the general-mode case, just with
  // the exact pending question deterministically appended so nothing is
  // ever lost (Parts 1/7/8).
  if (
    complaintInterruption === 'identity_question' ||
    complaintInterruption === 'out_of_scope' ||
    complaintInterruption === 'greeting'
  ) {
    const baseAnswer =
      complaintInterruption === 'identity_question'
        ? sc.identity
        : complaintInterruption === 'greeting'
          ? sc.greeting
          : sc.outOfScope
    return NextResponse.json<ChatSuccessResponse>(
      {
        answer: pendingQuestionText
          ? appendPendingQuestion(baseAnswer, pendingQuestionText)
          : baseAnswer,
        intent: complaintInterruption,
        confidence: 'high',
        grounded: complaintInterruption === 'identity_question',
        missingFields: missingFieldsResult ? missingFieldsResult.missingFields : [],
        suggestedQuestions: [],
        sources: [],
        routing,
        // Deliberately null, even though a pending field exists: `answer`
        // above already carries the full composed text (fixed response +
        // resumed question) — the client prefers `nextQuestion` over
        // `answer` for display when present, which would otherwise drop the
        // fixed-response half entirely and show only the bare question.
        nextQuestion: null,
        nextFieldKey: nextField?.key ?? null,
        readyToGenerateComplaint: false,
        routingPersisted,
      },
      { status: 200 },
    )
  }

  // Emergency Fix — electricity-complaint bug, root cause. Confirmed via
  // live reproduction: once missingFieldsResult.readyToGenerateComplaint is
  // true, the response built after generation below (see the `isServerReady`
  // ternary) ALWAYS uses the fixed sc.completion as `answer` — the
  // model's own output is computed and then unconditionally discarded. This
  // block used to still pay for a full generation call anyway: a live-tested
  // Gemini call regularly took 7-14+ seconds, and with no `maxDuration` set
  // on this route (see the export above — now fixed defensively too), the
  // combined retrieval+routing+missing-fields+generation time could exceed
  // Vercel's platform default function-execution budget, silently killing
  // the function mid-request. The client then sees a bare network failure
  // indistinguishable from a real outage and falls back to the local mocked
  // engine (lib/wasal/chat-client.ts), displaying "تعذر معالجة طلبك حالياً"
  // in place of the real, already-decided answer.
  //
  // Electricity's complaint type has only two required fields
  // (problem_description, city — supabase complaint_types.required_fields),
  // so it reaches readyToGenerateComplaint immediately after the city
  // answer — the exact, deterministic trigger reported. Any other sector
  // hits the identical risk the moment ITS last required field is answered;
  // electricity was simply the first (and shortest) one to expose it.
  //
  // The condition below mirrors the identical, already-model-independent
  // classification `finalIntent` computes after generation (Part 7.1/7.2):
  // whenever one of these is true, `isComplaint` is guaranteed true and the
  // model's own `result.intent` is never even consulted — so nothing here
  // depends on output this function hasn't already produced. Exactly like
  // the identity/out-of-scope/greeting early returns above, the model is
  // simply never called once the eventual answer no longer depends on it.
  const willBeComplaintIntent =
    complaintInterruption === 'complaint_side_question' ||
    intent === 'complaint_guidance' ||
    intent === 'create_complaint' ||
    explicitCreateComplaint
  if (willBeComplaintIntent && missingFieldsResult?.readyToGenerateComplaint) {
    const sources: ChatSource[] = retrievedDocuments.slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.title,
      entityName: doc.entityName,
      officialUrl: doc.officialUrl,
      similarity: doc.similarity,
    }))
    return NextResponse.json<ChatSuccessResponse>(
      {
        answer: sc.completion,
        intent: explicitCreateComplaint
          ? 'create_complaint'
          : complaintInterruption === 'complaint_side_question'
            ? 'complaint_side_question'
            : 'complaint_guidance',
        confidence: 'high',
        grounded: false,
        missingFields: [],
        suggestedQuestions: [],
        sources,
        routing,
        nextQuestion: null,
        nextFieldKey: null,
        readyToGenerateComplaint: true,
        routingPersisted,
      },
      { status: 200 },
    )
  }

  // Phase 7.6, Part 4 (broadened in Phase 7.7, Part 5) — a message that only
  // names a broad sector/entity ("لدي مشكلة مع شركة اتصالات", "أريد تقديم
  // شكوى ضد متجر") must never be treated as if it already described a
  // specific issue. Checked against whatever text is actually recorded as
  // `problem_description` so far (falling back to this turn's own message
  // when nothing is recorded yet) — not merely against whether `nextField`
  // still equals `problem_description`. That narrower, Phase 7.6 version
  // missed a real case: a generic starter chip's own text gets merged into
  // `problem_description` by the client the moment the complaint builder
  // starts (see wasal-chat.tsx's deriveComplaintResumeState), so by the time
  // this request arrives, `problem_description` already looks "known" and
  // `nextField` has already moved on to the next required field (e.g.
  // `merchant_name`) — even though the description itself is still just the
  // generic starter text, never a real answer. Never fires once the
  // complaint is already ready (nothing left to clarify), and never for a
  // side question (handled separately above).
  const genericStarterSector = (() => {
    if (complaintInterruption === 'complaint_side_question') return null
    // Readiness is not "every required field has a value": a description
    // that only asks to complain ("وين أشتكي على الموية؟") plus a city is
    // not enough to write a letter, so the problem-type question re-opens.
    // Any other description keeps a ready complaint ready.
    const readyDescription =
      sanitizedComplaintContext?.collectedFields?.problem_description ||
      sanitizedComplaintContext?.description ||
      ''
    const descriptionIsOnlyARequest =
      readyDescription !== '' && isOnlyComplaintRequest(readyDescription)
    if (missingFieldsResult?.readyToGenerateComplaint && !descriptionIsOnlyARequest) return null
    // A plain information question ("ما رقم بلاغات وزارة التجارة؟") is
    // answered, never met with "what exactly is the problem?" (evals).
    if (!hasActiveComplaintContext && isInformationQuestion(sanitizedMessage)) return null
    if (!routing?.entityName) return null
    const sector = ENTITY_NAME_TO_SECTOR[routing.entityName]
    if (!sector) return null
    const problemDescriptionText =
      sanitizedComplaintContext?.collectedFields?.problem_description ||
      sanitizedComplaintContext?.description ||
      sanitizedMessage
    if (descriptionIsOnlyARequest) return sector
    return hasSectorIssueSignal(sector, problemDescriptionText) ? null : sector
  })()
  if (genericStarterSector) {
    const clarification = subtypeClarificationQuestion(genericStarterSector, locale)
    if (clarification) {
      return NextResponse.json<ChatSuccessResponse>(
        {
          answer: clarification,
          intent: 'complaint_guidance',
          confidence: 'high',
          grounded: false,
          missingFields: missingFieldsResult ? missingFieldsResult.missingFields : [],
          suggestedQuestions: [],
          sources: [],
          routing,
          nextQuestion: clarification,
          // Always `problem_description`, regardless of what `nextField`
          // itself currently is — the next answer must refine the still-
          // generic description, never be attributed to whatever field
          // `nextField` had already advanced to (see the comment above).
          nextFieldKey: 'problem_description',
          readyToGenerateComplaint: false,
          routingPersisted,
        },
        { status: 200 },
      )
    }
  }

  const collectedFieldsHintLines: string[] = []
  // Phase 7.1: never built for a message that isn't at least plausibly
  // complaint-related — an informational question must never be told about
  // "already collected" complaint fields or nudged toward a "next question"
  // framing, even if stale collectedFields happen to be present on the
  // request.
  const collectedFields = likelyComplaint ? sanitizedComplaintContext?.collectedFields : undefined
  if (collectedFields && Object.keys(collectedFields).length > 0) {
    const collectedText = Object.entries(collectedFields)
      .map(([key, value]) => `- ${key} = ${value}`)
      .join('\n')
    collectedFieldsHintLines.push(
      `المعلومات المعروفة بالفعل عن المستخدم (لا تطلبها مرة أخرى مهما كان الحال):\n${collectedText}`,
    )
  }
  // Phase 7.2, Part 4/9: a side question gets a narrow, self-contained
  // instruction instead of the usual "ask about the next field" framing —
  // the model must answer only the side question; the pending question is
  // appended deterministically afterward (never phrased by the model).
  if (complaintInterruption === 'complaint_side_question') {
    collectedFieldsHintLines.push(
      'المستخدم يجمع بلاغاً حالياً، لكنه طرح سؤالاً جانبياً منفصلاً عن تفاصيل البلاغ في رسالته الحالية. أجب فقط على هذا السؤال الجانبي بإيجاز شديد (جملة أو جملتين) بالاعتماد على المعلومات المسترجعة إن وجدت؛ وإن لم تكن متوفرة وموثوقة فصرّح بذلك بوضوح. لا تذكر حقول البلاغ إطلاقاً، ولا تطرح أي سؤال متابعة خاص بالبلاغ في ردك — سيُلحق سؤال المتابعة تلقائياً بعد إجابتك.',
    )
  } else if (nextField) {
    collectedFieldsHintLines.push(
      `المطلوب الآن هو سؤال المستخدم عن الحقل التالي فقط: ${nextField.label_ar}.${nextFieldHint ? ` توجيه: ${nextFieldHint}` : ''} لا تطلب أي معلومة أخرى غير هذه في هذا الرد، ولا تكرر أي سؤال عن المعلومات المذكورة أعلاه.`,
    )
  }
  const complaintContextHint = collectedFieldsHintLines.join('\n\n') || undefined

  // Everything except collectedFields — the raw map never reaches buildPrompt
  // directly, only the flattened, single-field hint text folded into
  // `description` above.
  const promptComplaintContextBase: ChatComplaintContext = {
    domainId: sanitizedComplaintContext?.domainId,
    entityId: sanitizedComplaintContext?.entityId,
    serviceId: sanitizedComplaintContext?.serviceId,
    complaintTypeId: sanitizedComplaintContext?.complaintTypeId,
    title: sanitizedComplaintContext?.title,
    description: sanitizedComplaintContext?.description,
    city: sanitizedComplaintContext?.city,
    issueDate: sanitizedComplaintContext?.issueDate,
  }
  const promptComplaintContext =
    complaintContextHint || Object.keys(promptComplaintContextBase).length > 0
      ? {
          ...promptComplaintContextBase,
          description:
            [promptComplaintContextBase.description, complaintContextHint]
              .filter(Boolean)
              .join('\n\n') || undefined,
        }
      : undefined

  const officialFacts =
    routing?.entityName && routing.confidence !== 'low'
      ? (() => {
          const profile = getAuthorityProfile(routing.entityName)
          return profile ? profilePromptBlock(profile, sanitizedMessage, locale) : undefined
        })()
      : undefined
  const prompt = buildPrompt({
    sanitizedMessage,
    sanitizedHistory: sanitizeHistory(history),
    intent,
    complaintContext: promptComplaintContext,
    retrievedDocuments,
    locale,
    verifiedAuthority:
      routing?.entityName && routing.confidence !== 'low'
        ? {
            nameAr: routing.entityName,
            nameEn:
              entityDisplayName(routing.entityName, 'en') !== routing.entityName
                ? entityDisplayName(routing.entityName, 'en')
                : undefined,
          }
        : undefined,
    officialFacts,
  })
  debugLog(
    `[chat] prompt-built length=${prompt.length} retrievedDocumentCount=${retrievedDocuments.length}`,
  )

  debugLog('[chat] generation-start')
  const generationStart = Date.now()
  try {
    const generation = await generateAnswer({ prompt })
    const result = generation.output
    // One structural line per generated turn — model, latency, outcome.
    // Never message content, prompts, identifiers or provider bodies.
    console.info(
      `[chat] generated provider=${generation.provider} model=${generation.model} genMs=${Date.now() - generationStart} totalMs=${Date.now() - requestStart} docs=${retrievedDocuments.length} locale=${locale} retrievalMs=${retrievalMs} promptChars=${prompt.length} factsChars=${officialFacts?.length ?? 0} inTok=${generation.usage?.promptTokens ?? '-'} outTok=${generation.usage?.completionTokens ?? '-'} attempts=${generation.attempts ?? '-'} modelIndex=${generation.modelIndex ?? '-'}`,
    )

    // Phase 7.1/7.2 — server-authoritative final intent. Deterministic
    // priority always wins when it applies (Part 7): a detected side
    // question is never second-guessed once resolved above; an already-
    // active complaint flow or an explicit create-complaint trigger is
    // never second-guessed by the model either. Otherwise the model's own
    // classification is used (coerced to a known value — never trusted
    // blindly), with one safety net: a real, confident routing match can
    // never be dismissed as out_of_scope (Part 6 — a government question is
    // never out-of-scope just because the model misjudged it, provided RAG
    // actually found solid evidence).
    let finalIntent: ChatIntent
    if (complaintInterruption === 'complaint_side_question') {
      finalIntent = 'complaint_side_question'
    } else if (
      intent === 'complaint_guidance' ||
      intent === 'create_complaint' ||
      explicitCreateComplaint
    ) {
      finalIntent = explicitCreateComplaint ? 'create_complaint' : 'complaint_guidance'
    } else {
      const modelIntent = coerceModelIntent(result.intent)
      finalIntent =
        // The safety net only applies on deterministic governmental evidence:
        // a routing that came from nearest-document retrieval alone must never
        // overrule the model's correct "out of scope" (production defect).
        modelIntent === 'out_of_scope' &&
        routing &&
        routing.confidence !== 'low' &&
        allowsRouting(assessment.kind)
          ? grievanceSignal
            ? 'complaint_guidance'
            : 'government_service_question'
          : modelIntent
    }

    // Safety net only — the pre-guards above already catch the vast majority
    // of these; this covers a message that reached here some other way (e.g.
    // a direct API call) but the model still correctly recognized as one of
    // these two fixed-response categories.
    if (finalIntent === 'identity_question') {
      return NextResponse.json<ChatSuccessResponse>(
        fixedIntentResponse('identity_question', sc.identity),
        { status: 200 },
      )
    }
    if (finalIntent === 'out_of_scope') {
      return NextResponse.json<ChatSuccessResponse>(
        fixedIntentResponse('out_of_scope', sc.outOfScope),
        { status: 200 },
      )
    }

    if (
      !routing &&
      deferredRouting &&
      (finalIntent === 'government_service_question' ||
        finalIntent === 'entity_information' ||
        finalIntent === 'complaint_guidance')
    ) {
      routing = deferredRouting
    }

    // Contact details the model wrote that are not verified (official
    // profiles, reference-data URLs, or the user's own words) are removed.
    const scrub = scrubUnverifiedContacts(result.answer, {
      officialUrls: [routing?.officialUrl, ...retrievedDocuments.map((doc) => doc.officialUrl)],
      userText: [
        sanitizedMessage,
        ...sanitizeHistory(history)
          .filter((item) => item.role === 'user')
          .map((item) => item.content),
      ].join('\n'),
    })
    if (scrub.removed.length > 0) {
      console.info(`[chat] removed-unverified-contacts count=${scrub.removed.length}`)
      result.answer = scrub.text
    }

    const isComplaint = isComplaintIntent(finalIntent)
    const sources: ChatSource[] = retrievedDocuments.slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.title,
      entityName: doc.entityName,
      officialUrl: doc.officialUrl,
      similarity: doc.similarity,
    }))
    // missingFields/readyToGenerateComplaint are server-authoritative whenever
    // missing-fields detection actually ran — the model's own output for
    // those two is never trusted, only used as a fallback when routing never
    // resolved a complaintTypeId at all. nextQuestion prefers the model's own
    // phrasing (it was given the one selected field + a hint, see above) but
    // only when a field was actually selected server-side; if the model
    // omitted one, the deterministic label-based template fills in. If no
    // field was selected (ready, or no complaint type resolved), any
    // model-produced nextQuestion is discarded — the model can never
    // introduce a question the server didn't ask for. None of this ever
    // applies to a non-complaint intent (Part 2): missingFields stays empty,
    // nextFieldKey/nextQuestion stay null, readyToGenerateComplaint stays
    // false, regardless of what missingFieldsResult (or the model) produced.
    const isServerReady = isComplaint && missingFieldsResult?.readyToGenerateComplaint === true

    // An informational answer must never invent a fact (Part 2) — if nothing
    // relevant was actually retrieved, the fixed "not verified" answer is
    // used instead of trusting whatever the model produced, with the real
    // official link appended only when routing actually verified one.
    const informationalFallback =
      isInformationalIntent(finalIntent) && retrievedDocuments.length === 0
        ? routing?.officialUrl
          ? `${sc.noVerifiedInfo}\n\n${sc.officialSiteLabel}: ${routing.officialUrl}`
          : sc.noVerifiedInfo
        : null

    // Phase 7.2, Part 6 — a side-question turn's displayed answer is always
    // the model's brief side-question answer with the exact, unchanged
    // pending question deterministically appended — never the model's own
    // attempt at a transition or follow-up (the prompt hint above explicitly
    // told it not to produce one).
    const sideQuestionAnswer =
      finalIntent === 'complaint_side_question' && pendingQuestionText
        ? appendPendingQuestion(result.answer, pendingQuestionText)
        : null

    // Authority continuity, part 2 — an informational answer about an
    // authority whose official site is verified in our reference data always
    // carries that link, so the answer never tells the user a link "isn't
    // available" while the authority card beside it shows one.
    const verifiedOfficialUrl =
      routing && routing.confidence !== 'low' && routing.officialUrl ? routing.officialUrl : null
    const withOfficialLink = (text: string): string =>
      verifiedOfficialUrl &&
      isInformationalIntent(finalIntent) &&
      !text.includes(verifiedOfficialUrl)
        ? `${text}\n\n${sc.officialSiteLabel}: ${verifiedOfficialUrl}`
        : text

    const response: ChatSuccessResponse = {
      ...result,
      intent: finalIntent,
      // Once the server has authoritatively determined every required field
      // is collected, the displayed message is this fixed string — never the
      // model's own free-text answer, which is otherwise unconstrained and
      // can invent an extra question outside complaint_types.required_fields.
      // Emergency release fix, Part 2 — the hard duplicate-question
      // invariant takes priority even over that: a confirmed
      // validation/persistence failure gets a short, honest retry notice
      // instead of ever silently repeating the exact same question.
      answer:
        isComplaint && duplicateInvariantViolated
          ? sc.validationRetry
          : isServerReady
            ? sc.completion
            : (sideQuestionAnswer ?? informationalFallback ?? withOfficialLink(result.answer)),
      sources,
      routing,
      missingFields: isComplaint
        ? missingFieldsResult
          ? missingFieldsResult.missingFields
          : result.missingFields
        : [],
      // Deliberately null for a side-question turn even though nextField is
      // set — `answer` above already carries the full composed text (brief
      // side answer + resumed question); see the identical note on the
      // complaint-interruption early return above.
      nextQuestion:
        isComplaint && duplicateInvariantViolated
          ? sc.validationRetry
          : isComplaint && nextField && finalIntent !== 'complaint_side_question'
            ? result.nextQuestion?.trim() || pendingQuestionText
            : null,
      nextFieldKey: isComplaint ? (nextField?.key ?? null) : null,
      readyToGenerateComplaint: isComplaint
        ? missingFieldsResult
          ? missingFieldsResult.readyToGenerateComplaint
          : (result.readyToGenerateComplaint ?? false)
        : false,
      routingPersisted: isComplaint ? routingPersisted : false,
    }
    return NextResponse.json<ChatSuccessResponse>(response, { status: 200 })
  } catch (error) {
    console.warn(
      `[chat] generation-failed category=${categorizeGenerationFailure(error)} genMs=${Date.now() - generationStart} totalMs=${Date.now() - requestStart}`,
    )
    // Phase 8, Part 1/16 — a model failure never needs to abort a complaint-
    // collection turn: routing/missing-fields were already resolved above
    // entirely independently of the model (RAG + the deterministic keyword
    // fallback + computeMissingFields). Only the model's own phrasing is
    // unavailable — the deterministic, label-based question already covers
    // the same content. Falling back to that here (instead of a hard error)
    // is what makes the whole legacy, hardcoded fallback engine unnecessary:
    // the one real state machine degrades gracefully on its own, so a
    // provider outage never actually stalls or resets a complaint in
    // progress. A genuinely open-ended informational question that fails
    // still has no deterministic answer to give, so that case is unchanged.
    //
    // The degraded, server-authored question is only appropriate inside an
    // active complaint flow (the client sends complaintContext). Outside it —
    // e.g. "what are the water company's working hours?", which merely names
    // a sector — answering a failed question with "describe the problem?"
    // would misrepresent what happened, so the honest error is returned.
    if (error instanceof AiProviderError && !hasActiveComplaintContext) {
      return errorResponse(sc.errors.unavailable, 502)
    }
    if (error instanceof AiProviderError) {
      if (duplicateInvariantViolated) {
        return NextResponse.json<ChatSuccessResponse>(
          {
            answer: sc.validationRetry,
            intent: 'complaint_guidance',
            confidence: 'medium',
            grounded: false,
            missingFields: missingFieldsResult ? missingFieldsResult.missingFields : [],
            suggestedQuestions: [],
            sources: [],
            routing,
            nextQuestion: sc.validationRetry,
            nextFieldKey: nextField?.key ?? null,
            readyToGenerateComplaint: false,
            routingPersisted,
          },
          { status: 200 },
        )
      }
      if (missingFieldsResult?.readyToGenerateComplaint) {
        return NextResponse.json<ChatSuccessResponse>(
          {
            answer: sc.completion,
            intent: 'complaint_guidance',
            confidence: 'high',
            grounded: false,
            missingFields: [],
            suggestedQuestions: [],
            sources: [],
            routing,
            nextQuestion: null,
            nextFieldKey: null,
            readyToGenerateComplaint: true,
            routingPersisted,
          },
          { status: 200 },
        )
      }
      if (nextField && pendingQuestionText) {
        return NextResponse.json<ChatSuccessResponse>(
          {
            answer: pendingQuestionText,
            intent: 'complaint_guidance',
            confidence: 'medium',
            grounded: false,
            missingFields: missingFieldsResult ? missingFieldsResult.missingFields : [],
            suggestedQuestions: [],
            sources: [],
            routing,
            nextQuestion: pendingQuestionText,
            nextFieldKey: nextField.key,
            readyToGenerateComplaint: false,
            routingPersisted,
          },
          { status: 200 },
        )
      }
      return errorResponse(sc.errors.unavailable, 502)
    }
    return errorResponse(sc.errors.unexpected, 500)
  }
}
