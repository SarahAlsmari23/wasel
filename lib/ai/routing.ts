import type { createClient } from '@/lib/supabase/server'
import type { SavedRoutingIds } from '@/lib/db/conversations'
import type { RetrievedDocument } from '@/lib/rag/types'
import type { ChatRouting } from '@/types/ai'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Server-authored, fixed string — never model-generated — used whenever a
// response reuses a previously-saved routing decision rather than one
// resolved fresh this turn.
const SAVED_ROUTING_REASON = 'استناداً إلى التصنيف الذي تم تحديده مسبقاً في هذه المحادثة.'

// A single, uncorroborated match needs a high similarity to be trusted at
// all; two or more retrieved results agreeing on the same service is the
// strongest signal and can reach 'high' confidence at the same bar.
const STRONG_SIMILARITY = 0.6
// Two different services, each backed by exactly one weak result, with
// similarities this close together, are treated as genuinely ambiguous
// evidence rather than arbitrarily picking one.
const CONFLICT_MARGIN = 0.05

type ServiceGroup = {
  serviceId: string
  /** Sorted by similarity, descending. */
  docs: RetrievedDocument[]
  maxSimilarity: number
}

function groupByService(documents: RetrievedDocument[]): ServiceGroup[] {
  const groups = new Map<string, RetrievedDocument[]>()
  for (const doc of documents) {
    if (!doc.serviceId) continue
    const existing = groups.get(doc.serviceId) ?? []
    existing.push(doc)
    groups.set(doc.serviceId, existing)
  }

  return Array.from(groups.entries())
    .map(([serviceId, docs]) => {
      const sorted = [...docs].sort((a, b) => b.similarity - a.similarity)
      return { serviceId, docs: sorted, maxSimilarity: sorted[0].similarity }
    })
    .sort((a, b) => b.docs.length - a.docs.length || b.maxSimilarity - a.maxSimilarity)
}

/** Deterministic, server-authored — references only the real matched
 * document title(s), never a model-generated claim. */
function buildReason(docs: RetrievedDocument[]): string {
  const top = docs[0]
  return docs.length > 1
    ? `استناداً إلى ${docs.length} نتائج مطابقة من قاعدة المعرفة الرسمية، أعلاها تشابهاً: "${top.title}".`
    : `استناداً إلى نتيجة مطابقة من قاعدة المعرفة الرسمية: "${top.title}".`
}

/**
 * Resolves complaint routing purely from what RAG already retrieved for this
 * turn — never from a model-generated identifier (no model call happens
 * here at all). `entityId` is the only value not already present on a
 * RetrievedDocument; it is resolved via one small, public-read lookup
 * (`government_services` carries the existing "public read access" RLS
 * policy — the caller's normal authenticated/anon client is sufficient, no
 * service-role client is used or needed).
 *
 * Returns `null` whenever the retrieved evidence doesn't corroborate a
 * single service strongly enough, is ambiguous between two comparably-weak
 * candidates, or the entityId lookup itself doesn't resolve cleanly — a
 * partial routing (e.g. a serviceId without a confirmed entityId) is never
 * returned.
 *
 * Phase 7.6, Part 5 — `entityName`, `complaintTypeId`, and `officialUrl` are
 * all read from this single `government_services` row (joined to its own
 * `government_entities`), never from the winning document's own denormalized
 * copies of those same facts. A knowledge_documents row's `entity`/
 * `complaint_type_id`/`official_url` columns are independent, hand-maintained
 * data that could in principle drift from the service it's actually tagged
 * to (`service_id`) — sourcing every routing field from that one service row
 * instead structurally guarantees entityId/serviceId/complaintTypeId can
 * never disagree with each other (e.g. an entity resolving to "الشركة
 * الوطنية للمياه" while complaintTypeId still points at a telecom category),
 * with no separate verification step needed.
 */
export async function resolveRouting(
  supabase: SupabaseServerClient,
  retrievedDocuments: RetrievedDocument[],
): Promise<ChatRouting | null> {
  const groups = groupByService(retrievedDocuments)
  if (groups.length === 0) return null

  const [winner, runnerUp] = groups

  const isConflicting =
    winner.docs.length === 1 &&
    runnerUp !== undefined &&
    runnerUp.docs.length === 1 &&
    winner.maxSimilarity - runnerUp.maxSimilarity < CONFLICT_MARGIN
  if (isConflicting) return null

  const confidence: ChatRouting['confidence'] =
    winner.docs.length >= 2
      ? winner.maxSimilarity >= STRONG_SIMILARITY
        ? 'high'
        : 'medium'
      : winner.maxSimilarity >= STRONG_SIMILARITY
        ? 'medium'
        : 'low'

  const { data, error } = await supabase
    .from('government_services')
    .select('entity_id, complaint_type_id, official_url, government_entities(name_ar)')
    .eq('id', winner.serviceId)
    .maybeSingle()

  if (error || !data?.entity_id) return null

  const entityRow = data.government_entities as unknown as { name_ar: string } | null
  const complaintTypeId = (data.complaint_type_id as string | null) ?? null
  const top = winner.docs[0]

  return {
    entityId: data.entity_id as string,
    entityName: entityRow?.name_ar ?? top.entityName ?? null,
    serviceId: winner.serviceId,
    complaintTypeId,
    confidence,
    reason: buildReason(winner.docs),
    officialUrl: (data.official_url as string | null) ?? top.officialUrl ?? null,
    complaintTypeLabel: await getComplaintTypeLabel(supabase, complaintTypeId),
  }
}

/** Public-read lookup, purely for display (see ChatRouting.complaintTypeLabel)
 * — never influences which service/entity/confidence was already decided
 * above. Returns null rather than throwing so a lookup failure never blocks
 * routing itself from resolving. */
async function getComplaintTypeLabel(
  supabase: SupabaseServerClient,
  complaintTypeId: string | null,
): Promise<string | null> {
  if (!complaintTypeId) return null
  const { data, error } = await supabase
    .from('complaint_types')
    .select('name_ar')
    .eq('id', complaintTypeId)
    .maybeSingle()

  if (error || !data) return null
  return (data.name_ar as string | null) ?? null
}

/**
 * Reconstructs a full ChatRouting from three previously-saved, already-
 * confirmed-non-null ids (see lib/db/conversations.ts's getSavedRouting,
 * which never returns a partial record). Two small public-read lookups
 * ("public read access" on both tables, same as resolveRouting's own
 * government_services lookup) — never a service-role client.
 *
 * Fails closed to null if the entity itself can no longer be confirmed to
 * exist (e.g. deactivated/deleted since it was saved) — a saved routing is
 * never reused on faith alone. Confidence is fixed at 'medium': only ever a
 * medium/high-confidence decision is saved in the first place (route.ts),
 * so this neither overclaims 'high' nor drops below the 'low' bar the rest
 * of the app already gates on (missing-fields activation, card population).
 */
export async function hydrateSavedRouting(
  supabase: SupabaseServerClient,
  saved: SavedRoutingIds,
): Promise<ChatRouting | null> {
  // Three independent public-read lookups — none depends on another's result
  // — run concurrently instead of as three sequential round trips (Phase 6.7,
  // Part 4). Same reads, same error handling, purely a latency improvement.
  const [entityResult, serviceResult, complaintTypeLabel] = await Promise.all([
    supabase.from('government_entities').select('name_ar').eq('id', saved.entityId).maybeSingle(),
    supabase
      .from('government_services')
      .select('official_url')
      .eq('id', saved.serviceId)
      .maybeSingle(),
    getComplaintTypeLabel(supabase, saved.complaintTypeId),
  ])

  if (entityResult.error || !entityResult.data) return null
  if (serviceResult.error) return null

  return {
    entityId: saved.entityId,
    entityName: entityResult.data.name_ar as string,
    serviceId: saved.serviceId,
    complaintTypeId: saved.complaintTypeId,
    confidence: 'medium',
    reason: SAVED_ROUTING_REASON,
    officialUrl: (serviceResult.data?.official_url as string | null) ?? null,
    complaintTypeLabel,
  }
}

/**
 * Decides which routing wins for this turn.
 *
 * Phase 7.4, Part 3 — once a routing decision is already saved for this
 * conversation, it is never silently replaced by a fresh one just because
 * *this* turn's message (an ordinary answer to a pending field — a city, a
 * provider name, a plain "نعم"/"لا") happens to RAG-match some other service
 * confidently. Re-resolving the entity on every single turn was the actual
 * bug: an unrelated field answer could flip `entity_id`/`complaintTypeId`
 * mid-complaint, silently discarding everything collected under the old
 * complaint type. A saved routing only ever yields to a fresh one when
 * `allowTopicChange` is true — the caller's existing, already-computed signal
 * that *this* message itself explicitly reads like a new grievance/complaint,
 * not just a routine answer (Part 3: "unless the user explicitly changes the
 * complaint's subject").
 *
 * With no saved routing yet (the normal case before the first confident
 * match), fresh evidence is trusted exactly as before — this only changes
 * behavior once a routing decision already exists.
 */
export function mergeRouting(
  fresh: ChatRouting | null,
  saved: ChatRouting | null,
  allowTopicChange: boolean,
): ChatRouting | null {
  if (saved && !allowTopicChange) return saved
  if (fresh && fresh.confidence !== 'low') return fresh
  if (saved) return saved
  return fresh
}
