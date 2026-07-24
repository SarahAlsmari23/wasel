import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { cloudflareProvider } from '../lib/ai/cloudflare'

const EMBEDDING_MODEL = '@cf/google/embeddinggemma-300m'
const EMBEDDING_DIMENSION = 768

// Reviewed starter dataset — see plan file. High-level entity
// responsibilities, general complaint categories, and official entity URLs
// only. No invented procedures, eligibility rules, response times,
// escalation paths, or complaint channels.
const REVIEWED_AT = '2026-07-24'

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

const ENTRIES: KnowledgeEntry[] = [
  {
    title: 'دور وزارة التجارة في حماية المستهلك',
    content:
      'تختص وزارة التجارة بالإشراف على الأسواق التجارية وحماية حقوق المستهلك، ومتابعة الالتزام بالأنظمة التجارية في المملكة العربية السعودية.',
    entity: 'وزارة التجارة',
    sector: 'commerce',
    documentType: 'general_info',
    sourceUrl: 'https://mc.gov.sa',
    sourceLabel: 'الموقع الرسمي لوزارة التجارة',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'اختصاص وزارة التجارة بالتجارة الإلكترونية',
    content:
      'تتابع وزارة التجارة أنشطة التجارة الإلكترونية داخل المملكة، وترتبط بالشكاوى المتعلقة بالمتاجر الإلكترونية والمنتجات المعروضة عبر الإنترنت.',
    entity: 'وزارة التجارة',
    sector: 'commerce',
    documentType: 'general_info',
    sourceUrl: 'https://mc.gov.sa',
    sourceLabel: 'الموقع الرسمي لوزارة التجارة',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'دور هيئة الاتصالات والفضاء والتقنية',
    content:
      'تتولى هيئة الاتصالات والفضاء والتقنية تنظيم قطاع الاتصالات وخدمات الإنترنت في المملكة، وتشرف على جودة الخدمات المقدمة من مشغلي الاتصالات.',
    entity: 'هيئة الاتصالات والفضاء والتقنية',
    sector: 'telecom',
    documentType: 'general_info',
    sourceUrl: 'https://www.cst.gov.sa',
    sourceLabel: 'الموقع الرسمي لهيئة الاتصالات والفضاء والتقنية',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'ارتباط الهيئة بشكاوى التغطية والفواتير',
    content:
      'ترتبط هيئة الاتصالات والفضاء والتقنية بالشكاوى المتعلقة بضعف تغطية شبكات الاتصال، وكذلك الاعتراضات على فواتير خدمات الاتصالات.',
    entity: 'هيئة الاتصالات والفضاء والتقنية',
    sector: 'telecom',
    documentType: 'general_info',
    sourceUrl: 'https://www.cst.gov.sa',
    sourceLabel: 'الموقع الرسمي لهيئة الاتصالات والفضاء والتقنية',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'اختصاص وزارة البلديات والإسكان بالخدمات البلدية',
    content:
      'تشرف وزارة البلديات والإسكان على تقديم الخدمات البلدية المتعلقة بالطرق والإنارة والنظافة والمرافق العامة في مختلف المناطق.',
    entity: 'وزارة البلديات والإسكان',
    sector: 'municipality',
    documentType: 'general_info',
    sourceUrl: 'https://balady.gov.sa',
    sourceLabel: 'الموقع الرسمي لوزارة البلديات والإسكان',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'ارتباط الوزارة بشكاوى الطرق والإنارة',
    content:
      'ترتبط وزارة البلديات والإسكان بالشكاوى المتعلقة بأعطال إنارة الشوارع وأضرار الطرق والمرافق العامة.',
    entity: 'وزارة البلديات والإسكان',
    sector: 'municipality',
    documentType: 'general_info',
    sourceUrl: 'https://balady.gov.sa',
    sourceLabel: 'الموقع الرسمي لوزارة البلديات والإسكان',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'دور الشركة الوطنية للمياه',
    content:
      'تختص الشركة الوطنية للمياه بتقديم خدمات المياه والصرف الصحي للمشتركين في مناطق عملها داخل المملكة العربية السعودية.',
    entity: 'الشركة الوطنية للمياه',
    sector: 'water',
    documentType: 'general_info',
    sourceUrl: 'https://www.nwc.com.sa',
    sourceLabel: 'الموقع الرسمي للشركة الوطنية للمياه',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'ارتباط الشركة باعتراضات فواتير المياه',
    content: 'ترتبط الشركة الوطنية للمياه باعتراضات المشتركين المتعلقة بفواتير استهلاك المياه.',
    entity: 'الشركة الوطنية للمياه',
    sector: 'water',
    documentType: 'general_info',
    sourceUrl: 'https://www.nwc.com.sa',
    sourceLabel: 'الموقع الرسمي للشركة الوطنية للمياه',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'دور الشركة السعودية للكهرباء',
    content:
      'تتولى الشركة السعودية للكهرباء توليد ونقل وتوزيع الطاقة الكهربائية لمشتركيها في مناطق عملها بالمملكة العربية السعودية.',
    entity: 'الشركة السعودية للكهرباء',
    sector: 'electricity',
    documentType: 'general_info',
    sourceUrl: 'https://www.se.com.sa',
    sourceLabel: 'الموقع الرسمي للشركة السعودية للكهرباء',
    reviewedAt: REVIEWED_AT,
  },
  {
    title: 'ارتباط الشركة بشكاوى الانقطاع والعدادات',
    content:
      'ترتبط الشركة السعودية للكهرباء بالشكاوى المتعلقة بانقطاع التيار الكهربائي وأعطال العدادات.',
    entity: 'الشركة السعودية للكهرباء',
    sector: 'electricity',
    documentType: 'general_info',
    sourceUrl: 'https://www.se.com.sa',
    sourceLabel: 'الموقع الرسمي للشركة السعودية للكهرباء',
    reviewedAt: REVIEWED_AT,
  },
]

function formatDocumentForEmbedding(title: string, content: string): string {
  // Google's documented document-embedding format for gemini-embedding-2 —
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

async function main() {
  const supabase = getServiceRoleClient()
  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const [index, entry] of ENTRIES.entries()) {
    const progress = `[${index + 1}/${ENTRIES.length}]`
    try {
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
      // raw Postgres/Gemini error body. Just which entry, and the failure's
      // generic type/name.
      const kind = error instanceof Error ? error.name : typeof error
      console.error(`${progress} failed: ${entry.title} (${kind})`)
      failed++
    }
  }

  console.log(
    `Done. inserted=${inserted} skipped=${skipped} failed=${failed} total=${ENTRIES.length}`,
  )
}

main()
