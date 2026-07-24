import { createClient } from '@supabase/supabase-js'
import { cloudflareProvider } from '../lib/ai/cloudflare'

const EMBEDDING_MODEL = '@cf/google/embeddinggemma-300m'
const EMBEDDING_DIMENSION = 768

// Same document-embedding format already used by scripts/ingest-knowledge.ts
// and documented for embeddinggemma-300m — unchanged by the provider swap.
function formatDocumentForEmbedding(title: string, content: string): string {
  return `title: ${title} | text: ${content}`
}

// Not exported, not imported by anything else — a second, script-local
// instance, same lazy/key-checked shape as lib/rag/retrieve.ts's private
// client and scripts/ingest-knowledge.ts's own client.
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

type KnowledgeRow = {
  id: string
  title: string
  content: string
}

async function main() {
  const supabase = getServiceRoleClient()

  const { data: rows, error: fetchError } = await supabase
    .from('knowledge_documents')
    .select('id, title, content')
    .returns<KnowledgeRow[]>()
  if (fetchError) throw fetchError

  let updated = 0
  let failed = 0

  for (const [index, row] of (rows ?? []).entries()) {
    const progress = `[${index + 1}/${(rows ?? []).length}]`
    try {
      const embedding = await cloudflareProvider.embed(
        formatDocumentForEmbedding(row.title, row.content),
      )
      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error('Unexpected embedding dimension.')
      }

      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update({ embedding, embedding_model: EMBEDDING_MODEL })
        .eq('id', row.id)
      if (updateError) throw updateError

      console.log(`${progress} re-embedded: ${row.title}`)
      updated++
    } catch (error) {
      const kind = error instanceof Error ? error.name : typeof error
      console.error(`${progress} failed: ${row.title} (${kind})`)
      failed++
    }
  }

  console.log(`Done. updated=${updated} failed=${failed} total=${(rows ?? []).length}`)
}

main()
