import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cloudflareProvider } from '../lib/ai/cloudflare'

const EMBEDDING_MODEL = '@cf/google/embeddinggemma-300m'
const EMBEDDING_DIMENSION = 768
// Resolved from the current working directory rather than __dirname/
// import.meta.url, since this script is always invoked via `npm run
// ingest:knowledge` from the project root (same place .env.local lives) —
// avoids any CJS/ESM ambiguity around module-relative paths.
const DATA_DIR = join(process.cwd(), 'data', 'knowledge')
// A single hand-authored, single-topic entry should never need to be this
// long — if it is, it's almost certainly an unsummarized paste that should
// be split into separate entries instead (see data/knowledge/README.md).
const MAX_CONTENT_LENGTH = 800

// One government entity + one complaint type per sector today (matches the
// 5 seeded government_entities/complaint_types rows exactly). Resolved
// against live DB rows at startup rather than hardcoding UUIDs, so this
// stays correct if reference data is ever re-seeded with different ids.
const SECTOR_TO_ENTITY_CODE: Record<string, string> = {
  commerce: 'mc',
  telecom: 'cst',
  municipality: 'balady',
  water: 'nwc',
  electricity: 'sec',
}
const SECTOR_TO_COMPLAINT_TYPE_CODE: Record<string, string> = {
  commerce: 'commerce_general',
  telecom: 'telecom_general',
  municipality: 'municipality_general',
  water: 'water_general',
  electricity: 'electricity_general',
}

type KnowledgeEntry = {
  title: string
  content: string
  entity: string
  sector: string
  documentType: string
  sourceUrl: string
  sourceLabel: string
  reviewedAt: string
}

/** Our own, self-authored validation failures — safe to log `.message` for
 * (fixed strings + public entry content, never a raw Postgres/Cloudflare
 * error body). Distinguished from other thrown errors in the catch block
 * below, which stay name/type-only. */
class IngestValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IngestValidationError'
  }
}

const REQUIRED_ENTRY_FIELDS: (keyof KnowledgeEntry)[] = [
  'title',
  'content',
  'entity',
  'sector',
  'documentType',
  'sourceUrl',
  'sourceLabel',
  'reviewedAt',
]

function isValidEntry(value: unknown): value is KnowledgeEntry {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return REQUIRED_ENTRY_FIELDS.every(
    (field) => typeof candidate[field] === 'string' && candidate[field] !== '',
  )
}

type LoadedEntry = {
  entry: KnowledgeEntry
  sourceFile: string
}

/** Reads and flattens every data/knowledge/*.json file. Throws on any file
 * that isn't valid JSON or doesn't contain an array of well-formed entries —
 * a malformed data file should stop the run, not silently skip content. */
function loadEntries(): LoadedEntry[] {
  const files = readdirSync(DATA_DIR).filter((file) => file.endsWith('.json'))
  const loaded: LoadedEntry[] = []

  for (const file of files) {
    const raw = readFileSync(join(DATA_DIR, file), 'utf-8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(`${file}: not valid JSON`)
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`${file}: expected a JSON array of entries`)
    }
    parsed.forEach((candidate, index) => {
      if (!isValidEntry(candidate)) {
        throw new Error(`${file}: entry ${index} is missing a required field`)
      }
      loaded.push({ entry: candidate, sourceFile: file })
    })
  }

  return loaded
}

function formatDocumentForEmbedding(title: string, content: string): string {
  // Google's documented document-embedding format for embeddinggemma-300m —
  // kept in the same representation space as retrieve.ts's query format.
  return `title: ${title} | text: ${content}`
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

// Not exported, not imported by anything else — a second, script-local
// instance, same lazy/key-checked shape as lib/rag/retrieve.ts's private
// client. That client stays private to retrieve.ts by design; this script
// needs its own.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service-role configuration is missing.')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Fetches the reference data needed to resolve each entry's service_id and
 * complaint_type_id from its sector — three small read-only selects, once. */
async function buildReferenceMaps(supabase: ReturnType<typeof getServiceRoleClient>) {
  const [entitiesResult, servicesResult, complaintTypesResult] = await Promise.all([
    supabase.from('government_entities').select('id, code'),
    supabase.from('government_services').select('id, entity_id'),
    supabase.from('complaint_types').select('id, code'),
  ])

  if (entitiesResult.error) throw entitiesResult.error
  if (servicesResult.error) throw servicesResult.error
  if (complaintTypesResult.error) throw complaintTypesResult.error

  const entityIdByCode = new Map<string, string>(
    (entitiesResult.data ?? []).map((row) => [row.code as string, row.id as string]),
  )
  const serviceIdByEntityId = new Map<string, string>(
    (servicesResult.data ?? []).map((row) => [row.entity_id as string, row.id as string]),
  )
  const complaintTypeIdByCode = new Map<string, string>(
    (complaintTypesResult.data ?? []).map((row) => [row.code as string, row.id as string]),
  )

  const serviceIdByEntityCode = new Map<string, string>()
  for (const [code, entityId] of entityIdByCode) {
    const serviceId = serviceIdByEntityId.get(entityId)
    if (serviceId) serviceIdByEntityCode.set(code, serviceId)
  }

  return { serviceIdByEntityCode, complaintTypeIdByCode }
}

async function main() {
  const supabase = getServiceRoleClient()
  const { serviceIdByEntityCode, complaintTypeIdByCode } = await buildReferenceMaps(supabase)

  const loadedEntries = loadEntries()

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const [index, { entry, sourceFile }] of loadedEntries.entries()) {
    const progress = `[${index + 1}/${loadedEntries.length}]`
    try {
      if (entry.content.length > MAX_CONTENT_LENGTH) {
        throw new IngestValidationError(
          `content exceeds ${MAX_CONTENT_LENGTH} characters — looks unchunked, split it into separate entries`,
        )
      }

      const entityCode = SECTOR_TO_ENTITY_CODE[entry.sector]
      const complaintTypeCode = SECTOR_TO_COMPLAINT_TYPE_CODE[entry.sector]
      const serviceId = entityCode ? serviceIdByEntityCode.get(entityCode) : undefined
      const complaintTypeId = complaintTypeCode
        ? complaintTypeIdByCode.get(complaintTypeCode)
        : undefined

      if (!serviceId || !complaintTypeId) {
        throw new IngestValidationError(
          `unable to resolve service/complaint type for sector "${entry.sector}"`,
        )
      }

      const contentHash = hashContent(entry.content)

      const { data: existing, error: existingError } = await supabase
        .from('knowledge_documents')
        .select('id')
        .eq('content_hash', contentHash)
        .maybeSingle()
      if (existingError) throw existingError

      if (existing) {
        console.log(`${progress} skip (duplicate): ${entry.title}`)
        skipped++
        continue
      }

      const embedding = await cloudflareProvider.embed(
        formatDocumentForEmbedding(entry.title, entry.content),
      )
      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error('Unexpected embedding dimension.')
      }

      const { error: insertError } = await supabase.from('knowledge_documents').insert({
        title: entry.title,
        content: entry.content,
        entity: entry.entity,
        sector: entry.sector,
        document_type: entry.documentType,
        service_id: serviceId,
        complaint_type_id: complaintTypeId,
        source_file: sourceFile,
        metadata: {
          source_url: entry.sourceUrl,
          source_label: entry.sourceLabel,
          reviewed_at: entry.reviewedAt,
        },
        embedding,
        embedding_model: EMBEDDING_MODEL,
        content_hash: contentHash,
        is_active: true,
      })
      if (insertError) throw insertError

      console.log(`${progress} inserted: ${entry.title}`)
      inserted++
    } catch (error) {
      // Structural only — never the embedding vector, never a key, never a
      // raw Postgres/Cloudflare error body. IngestValidationError messages
      // are our own, hand-authored, and safe to log in full; anything else
      // (Postgrest errors, AiProviderError, etc.) only ever logs its name.
      const detail =
        error instanceof IngestValidationError
          ? error.message
          : error instanceof Error
            ? error.name
            : typeof error
      console.error(`${progress} failed: ${entry.title} (${detail})`)
      failed++
    }
  }

  console.log(
    `Done. inserted=${inserted} skipped=${skipped} failed=${failed} total=${loadedEntries.length}`,
  )
}

main().catch((error: unknown) => {
  // Structural only — a Postgrest error's .message describes a query/schema
  // problem against these known public reference tables, not user data or a
  // secret, so it's safe to surface here (unlike the per-entry catch above,
  // which stays name-only for errors that could originate from row content).
  const detail =
    error instanceof IngestValidationError || error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error
  console.error(`Ingestion aborted before completion: ${detail}`)
  process.exitCode = 1
})
