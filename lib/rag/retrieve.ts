import { createClient } from '@supabase/supabase-js'
import { cloudflareProvider } from '@/lib/ai/cloudflare'
import type { RetrievalFilters, RetrievedDocument } from '@/lib/rag/types'

const RPC_TIMEOUT_MS = 10_000
const MAX_RESULTS = 5
const EXCERPT_MAX_LENGTH = 300
// Recalibrated for @cf/google/embeddinggemma-300m, which produces
// meaningfully lower cosine-similarity scores than gemini-embedding-2 did
// for the same semantic matches (observed ~0.46 vs. ~0.76 previously for an
// identical query/document pair). Provisional — based on one test query,
// not a rigorous tuning pass; revisit as real usage accumulates.
const SIMILARITY_THRESHOLD = 0.4

/**
 * Wraps every retrieval failure mode (missing service-role config, RPC
 * failure/timeout, enrichment lookup failure). Raw Postgres/Supabase error
 * text is never attached — only this generic, internal-only message.
 */
export class RetrievalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetrievalError'
  }
}

// Not exported. Never imported by anything outside this file. Constructed
// lazily so merely importing this module never requires the key to exist.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new RetrievalError('Retrieval is not configured.')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new RetrievalError('Retrieval request timed out.'))
    }, ms)

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

// Google's documented retrieval format for gemini-embedding-2 — fixed and
// server-controlled, never user-overridable.
function formatQueryForEmbedding(sanitizedQuery: string): string {
  return `task: search result | query: ${sanitizedQuery}`
}

function truncateExcerpt(content: string, maxLength = EXCERPT_MAX_LENGTH): string {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}…`
}

type MatchKnowledgeDocumentsRow = {
  id: string
  title: string
  content: string
  service_id: string | null
  complaint_type_id: string | null
  similarity: number
}

type ServiceEnrichment = {
  entityName?: string
  officialUrl?: string
}

/**
 * Enriches ≤5 already-matched documents with an entity name and official
 * source URL, via two small bounded lookups (never guaranteed to find
 * either — nullable FKs throughout). Never duplicates a document row.
 */
async function buildServiceEnrichment(
  serviceIds: string[],
): Promise<Map<string, ServiceEnrichment>> {
  const enrichment = new Map<string, ServiceEnrichment>()
  if (serviceIds.length === 0) return enrichment

  const supabase = getServiceRoleClient()

  const { data: services, error: servicesError } = await withTimeout(
    supabase.from('government_services').select('id, entity_id').in('id', serviceIds),
    RPC_TIMEOUT_MS,
  )
  if (servicesError) {
    throw new RetrievalError('Failed to enrich retrieval results.')
  }

  const entityIdByServiceId = new Map<string, string>()
  const entityIds: string[] = []
  for (const service of services ?? []) {
    if (service.entity_id) {
      entityIdByServiceId.set(service.id, service.entity_id)
      entityIds.push(service.entity_id)
    }
  }

  const [entitiesResult, sourcesResult] = await Promise.all([
    entityIds.length > 0
      ? withTimeout(
          supabase.from('government_entities').select('id, name_ar').in('id', entityIds),
          RPC_TIMEOUT_MS,
        )
      : Promise.resolve({ data: [], error: null }),
    withTimeout(
      supabase
        .from('official_sources')
        .select('service_id, source_url, verification_status')
        .in('service_id', serviceIds),
      RPC_TIMEOUT_MS,
    ),
  ])

  if (entitiesResult.error || sourcesResult.error) {
    throw new RetrievalError('Failed to enrich retrieval results.')
  }

  const entityNameById = new Map<string, string>()
  for (const entity of entitiesResult.data ?? []) {
    entityNameById.set(entity.id, entity.name_ar)
  }

  const sourcesByServiceId = new Map<
    string,
    { source_url: string; verification_status: string }[]
  >()
  for (const source of sourcesResult.data ?? []) {
    if (!source.service_id) continue
    const existing = sourcesByServiceId.get(source.service_id) ?? []
    existing.push(source)
    sourcesByServiceId.set(source.service_id, existing)
  }

  for (const serviceId of serviceIds) {
    const entityId = entityIdByServiceId.get(serviceId)
    const entityName = entityId ? entityNameById.get(entityId) : undefined

    const sources = sourcesByServiceId.get(serviceId) ?? []
    const preferredSource =
      sources.find((source) => source.verification_status === 'verified') ?? sources[0]

    enrichment.set(serviceId, {
      entityName,
      officialUrl: preferredSource?.source_url,
    })
  }

  return enrichment
}

/**
 * Retrieves up to 5 relevant knowledge documents for a sanitized query.
 * Server-only. Never called from a Client Component.
 */
export async function retrieveRelevantDocuments(
  query: string,
  filters?: RetrievalFilters,
): Promise<RetrievedDocument[]> {
  const formattedQuery = formatQueryForEmbedding(query)
  const queryEmbedding = await cloudflareProvider.embed(formattedQuery)

  const supabase = getServiceRoleClient()

  const { data, error } = await withTimeout(
    supabase.rpc('match_knowledge_documents', {
      query_embedding: queryEmbedding,
      match_count: MAX_RESULTS,
      similarity_threshold: SIMILARITY_THRESHOLD,
      filter_service_id: filters?.serviceId ?? null,
      filter_complaint_type_id: filters?.complaintTypeId ?? null,
    }),
    RPC_TIMEOUT_MS,
  )

  if (error) {
    throw new RetrievalError('Retrieval request failed.')
  }

  const rows = (data ?? []) as MatchKnowledgeDocumentsRow[]
  if (rows.length === 0) return []

  const serviceIds = Array.from(
    new Set(rows.map((row) => row.service_id).filter((id): id is string => id !== null)),
  )
  const enrichmentByServiceId = await buildServiceEnrichment(serviceIds)

  return rows.map((row) => {
    const enrichment = row.service_id ? enrichmentByServiceId.get(row.service_id) : undefined
    return {
      id: row.id,
      title: row.title,
      excerpt: truncateExcerpt(row.content),
      serviceId: row.service_id,
      complaintTypeId: row.complaint_type_id,
      similarity: row.similarity,
      entityName: enrichment?.entityName,
      officialUrl: enrichment?.officialUrl,
    }
  })
}
