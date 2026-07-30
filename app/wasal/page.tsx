import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WasalChat } from '@/components/wasal/wasal-chat'
import type { ComplaintResult } from '@/components/wasal/complaint-result-card'
import { hydrateSavedRouting } from '@/lib/ai/routing'
import { buildComplaintAnalysisFromRouting } from '@/lib/complaints/analysis'
import { getCollectedInformationForConversation } from '@/lib/db/collected-information'
import { loadComplaintCollectionState } from '@/lib/wasal/conversation-state'
import { getComplaintByConversationId } from '@/lib/db/complaints'
import { getConversationWithMessages, getSavedRouting } from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'
import type { ComplaintAnalysis, WasalMode } from '@/types/wasal'

type SearchParams = { mode?: string | string[]; conversationId?: string | string[] }

function parseMode(value: string | string[] | undefined): WasalMode | undefined {
  if (value === 'assistant' || value === 'complaint') return value
  return undefined
}

function parseConversationId(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function toComplaintResult(
  complaint: Awaited<ReturnType<typeof getComplaintByConversationId>>,
): ComplaintResult | null {
  if (!complaint) return null
  return {
    id: complaint.id,
    referenceNumber: complaint.referenceNumber,
    title: complaint.title,
    status: complaint.status,
    submittedAt: complaint.submittedAt,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    entityName: complaint.entityName ?? '',
    officialUrl: complaint.officialUrl ?? '',
    subject: complaint.subject,
    complaintText: complaint.complaintText,
  }
}

/**
 * Resolved once, server-side, for a resumed (?conversationId=) complaint
 * conversation that has no complaint record yet — reconstructs exactly the
 * "ready" state a live turn would have reached, purely from already-saved
 * routing + already-collected fields (never a model call). If routing is
 * incomplete or restored fields don't yet satisfy every required field, the
 * conversation stays a normal, safely-resumable in-progress session instead.
 */
async function resolveInProgressComplaintState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string,
): Promise<{
  collectedFields: Record<string, string> | undefined
  pendingFieldKey: string | undefined
  analysis: ComplaintAnalysis | null
  isComplaintReady: boolean
  routingPersisted: boolean
}> {
  const collectedFields = await getCollectedInformationForConversation(supabase, conversationId)
  const savedRouting = await getSavedRouting(supabase, conversationId, userId)
  const routingPersisted = Boolean(savedRouting)

  if (Object.keys(collectedFields).length === 0) {
    return {
      collectedFields: undefined,
      pendingFieldKey: undefined,
      analysis: null,
      isComplaintReady: false,
      routingPersisted,
    }
  }

  if (!savedRouting) {
    return {
      collectedFields,
      pendingFieldKey: undefined,
      analysis: null,
      isComplaintReady: false,
      routingPersisted,
    }
  }

  const collectionState = await loadComplaintCollectionState(
    supabase,
    savedRouting.complaintTypeId,
    collectedFields,
  )
  const missing = collectionState?.missing
  const isComplaintReady = Boolean(missing?.readyToGenerateComplaint)

  // Emergency release fix, Part 7/8 — the authority card is reconstructed
  // as soon as routing is valid (getSavedRouting only ever returns a fully
  // resolved entity/service/complaintType triple — see lib/db/conversations.ts),
  // independent of whether every required field has been collected yet.
  // `isComplaintReady` (returned separately) is the only signal that gates
  // the composer lock and the save button.
  const hydratedRouting = await hydrateSavedRouting(supabase, savedRouting)
  const analysis = hydratedRouting
    ? buildComplaintAnalysisFromRouting(hydratedRouting, collectedFields)
    : null

  return {
    collectedFields,
    pendingFieldKey: isComplaintReady ? undefined : missing?.nextField?.key,
    analysis,
    isComplaintReady,
    routingPersisted,
  }
}

async function loadDisplayTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
): Promise<string> {
  const conversation = await getConversationWithMessages(supabase, conversationId)
  return conversation ? conversation.title : 'واصل'
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const conversationId = parseConversationId(params.conversationId)
  if (!conversationId) return {}

  const supabase = await createClient()
  const title = await loadDisplayTitle(supabase, conversationId)
  return { title }
}

export default async function WasalPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [supabase, params] = await Promise.all([createClient(), searchParams])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TEMPORARY DIAGNOSTIC — structural only (boolean, no user id/email).
  // Remove once Phase 1 persistence is confirmed working end-to-end.
  console.log(`[wasal-page] isAuthenticated=${Boolean(user)}`)

  const conversationId = parseConversationId(params.conversationId)

  if (conversationId) {
    // Resuming a real, already-owned saved conversation — RLS-scoped, so a
    // foreign or nonexistent id (or a signed-out request) resolves to null
    // here and 404s, same as the conversation detail page it was linked from.
    const conversation = await getConversationWithMessages(supabase, conversationId)
    if (!conversation) {
      notFound()
    }

    const complaint =
      conversation.mode === 'complaint' && user
        ? await getComplaintByConversationId(supabase, conversationId, user.id)
        : null

    let initialCollectedFields: Record<string, string> | undefined
    let initialPendingFieldKey: string | undefined
    let initialAnalysis: ComplaintAnalysis | null = null
    let initialIsComplaintReady = false
    let initialRoutingPersisted = false

    if (conversation.mode === 'complaint' && user && !complaint) {
      const state = await resolveInProgressComplaintState(supabase, conversationId, user.id)
      initialCollectedFields = state.collectedFields
      initialPendingFieldKey = state.pendingFieldKey
      initialAnalysis = state.analysis
      initialIsComplaintReady = state.isComplaintReady
      initialRoutingPersisted = state.routingPersisted
    }

    return (
      <WasalChat
        isAuthenticated={Boolean(user)}
        initialConversation={{
          id: conversation.id,
          mode: conversation.mode,
          messages: conversation.messages,
        }}
        initialComplaintResult={toComplaintResult(complaint)}
        initialCollectedFields={initialCollectedFields}
        initialPendingFieldKey={initialPendingFieldKey}
        initialAnalysis={initialAnalysis}
        initialIsComplaintReady={initialIsComplaintReady}
        initialRoutingPersisted={initialRoutingPersisted}
      />
    )
  }

  return <WasalChat isAuthenticated={Boolean(user)} initialMode={parseMode(params.mode)} />
}
