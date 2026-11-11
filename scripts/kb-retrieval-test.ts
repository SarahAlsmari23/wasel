/**
 * Retrieval test with REAL embeddings, run against an ISOLATED COPY of the
 * production database (a restored backup), never production itself:
 *
 *   KB_TEST_PSQL="docker exec -i <container> psql -U supabase_admin -d postgres" \
 *     npx tsx scripts/kb-retrieval-test.ts
 *
 * 1. "before": runs every evaluation query (real query embeddings from
 *    .kb-preflight/embeddings.json) through the production function
 *    match_knowledge_documents(q, 5, 0.4) — the same call lib/rag/retrieve.ts
 *    makes — and scores it with the production routing rules
 *    (lib/ai/routing.ts resolveRouting).
 * 2. applies 01_official_sources, 04_verified_passages (real vectors) and
 *    02_deactivate_outdated to the copy;
 * 3. "after": the same queries again. Writes .kb-preflight/retrieval-report.json.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import data from '../data/government/authorities.json'
import { resolveRouting } from '@/lib/ai/routing'
import type { RetrievedDocument } from '@/lib/rag/types'

const PSQL = process.env.KB_TEST_PSQL ?? ''
if (!/^docker exec -i [\w.-]+ psql /.test(PSQL)) {
  console.error(
    'KB_TEST_PSQL must be a "docker exec -i <container> psql …" command for a restored copy.',
  )
  process.exit(1)
}
const M = join(process.cwd(), 'supabase', 'maintenance', 'knowledge-2026-11')
const run = (sql: string) =>
  execSync(`${PSQL} -v ON_ERROR_STOP=1 -q -At`, { input: sql, maxBuffer: 1 << 28 })
    .toString()
    .trim()

type Query = {
  id: string
  set: string
  text: string
  authority: string | null
  lang: string
  expect?: string[]
  kind?: string
  embedding: number[]
}
const emb = JSON.parse(
  readFileSync(join(process.cwd(), '.kb-preflight', 'embeddings.json'), 'utf8'),
) as { queries: Query[] }
const queries = emb.queries
const LEGACY = /الشركة السعودية للكهرباء|وزارة الشؤون البلدية والقروية/

type Row = {
  id: string
  title: string
  content: string
  service_id: string
  similarity: number
  code: string
  entity: string
  active: boolean
  kb_version: string | null
  source_id: string | null
}
function retrieve(): Map<string, Row[]> {
  const values = queries.map((q) => `(${`'${q.id}'`}, '[${q.embedding.join(',')}]')`).join(',\n')
  const out = run(`
create schema if not exists kbtest;
drop table if exists kbtest.q;
create table kbtest.q (id text primary key, emb extensions.vector(768));
insert into kbtest.q values ${values};
select 'JSON:' || replace(coalesce(json_agg(r), '[]')::text, E'\n', ' ') from (
  select q.id as qid, m.id, m.title, m.content, m.service_id, m.similarity, ge.code, kd.entity, kd.is_active as active,
         kd.metadata->>'kb_version' as kb_version, kd.metadata->>'source_id' as source_id
  from kbtest.q q
  cross join lateral public.match_knowledge_documents(q.emb, 5, 0.4) m
  join public.knowledge_documents kd on kd.id = m.id
  left join public.government_services gs on gs.id = m.service_id
  left join public.government_entities ge on ge.id = gs.entity_id
  order by q.id, m.similarity desc
) r;
drop table kbtest.q;`)
  const line = out.split('\n').find((l) => l.startsWith('JSON:'))
  if (!line) throw new Error('No retrieval output.')
  const rows = JSON.parse(line.slice(5)) as (Row & { qid: string })[]
  const map = new Map<string, Row[]>()
  for (const r of rows) map.set(r.qid, [...(map.get(r.qid) ?? []), r])
  return map
}

const serviceCode = new Map<string, string>()
const entityName = new Map<string, string>()
function fakeSupabase() {
  // resolveRouting only reads one government_services row (+ a label); answer from the copy.
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (_c: string, id: string) => ({
          maybeSingle: async () =>
            table === 'government_services'
              ? {
                  data: {
                    entity_id: serviceCode.get(id),
                    complaint_type_id: null,
                    official_url: null,
                    government_entities: { name_ar: entityName.get(id) },
                  },
                  error: null,
                }
              : { data: null, error: null },
        }),
      }),
    }),
  } as never
}

async function score(label: string, map: Map<string, Row[]>) {
  const s = {
    label,
    knowledge: {
      n: 0,
      top1Authority: 0,
      verifiedInTop5: 0,
      factInExcerpts: 0,
      factQuestions: 0,
      sourceVerified: 0,
    },
    chat313: {
      n: 0,
      routedCorrect: 0,
      routedWrong: 0,
      routedNone: 0,
      noAuthorityExpected: 0,
      routedWhenNoneExpected: 0,
    },
    outdatedReturned: 0,
    inactiveReturned: 0,
    perAuthority: {} as Record<string, { n: number; ok: number }>,
    perLang: {} as Record<string, { n: number; ok: number }>,
    misses: [] as string[],
  }
  const verifiedSources = new Set(
    (data as unknown as { sources: { id: string; authority: string }[] }).sources.map((x) => x.id),
  )
  for (const q of queries) {
    const rows = map.get(q.id) ?? []
    for (const r of rows) {
      if (LEGACY.test(r.entity) || LEGACY.test(r.title)) s.outdatedReturned++
      if (!r.active) s.inactiveReturned++
      serviceCode.set(r.service_id, r.code)
      entityName.set(r.service_id, r.entity)
    }
    const docs: RetrievedDocument[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: r.content.slice(0, 300),
      serviceId: r.service_id,
      complaintTypeId: null,
      similarity: r.similarity,
    }))
    const routing = await resolveRouting(fakeSupabase(), docs)
    const routed =
      routing && routing.confidence !== 'low'
        ? (rows.find((r) => r.service_id === routing.serviceId)?.code ?? null)
        : null
    if (q.set === 'knowledge') {
      s.knowledge.n++
      const ok = rows[0]?.code === q.authority
      if (ok) s.knowledge.top1Authority++
      if (rows.some((r) => r.kb_version === 'verified-2026-11' && r.code === q.authority))
        s.knowledge.verifiedInTop5++
      if (rows[0]?.source_id && verifiedSources.has(rows[0].source_id)) s.knowledge.sourceVerified++
      if (q.kind !== 'unanswerable' && q.expect?.length) {
        s.knowledge.factQuestions++
        const excerpts = rows.map((r) => r.content.slice(0, 300)).join('\n')
        if (q.expect.every((e) => excerpts.includes(e))) s.knowledge.factInExcerpts++
      }
      const a = (s.perAuthority[q.authority!] ??= { n: 0, ok: 0 })
      a.n++
      if (ok) a.ok++
      const l = (s.perLang[q.lang] ??= { n: 0, ok: 0 })
      l.n++
      if (ok) l.ok++
      if (!ok)
        s.misses.push(
          `${q.id} ${q.authority} top1=${rows[0]?.code ?? 'none'} :: ${q.text.slice(0, 60)}`,
        )
    } else if (q.set === 'chat313') {
      s.chat313.n++
      if (!q.authority) {
        s.chat313.noAuthorityExpected++
        if (routed) s.chat313.routedWhenNoneExpected++
      } else if (routed === q.authority) s.chat313.routedCorrect++
      else if (routed) s.chat313.routedWrong++
      else s.chat313.routedNone++
    }
  }
  return s
}

async function main() {
  const before = await score('before (current production knowledge base)', retrieve())
  console.log('applying 01, 04 (real embeddings), 02 to the COPY …')
  for (const f of [
    '01_official_sources.sql',
    '04_verified_passages.sql',
    '02_deactivate_outdated.sql',
  ])
    run(readFileSync(join(M, f), 'utf8'))
  const after = await score('after (verified update applied)', retrieve())
  writeFileSync(
    join(process.cwd(), '.kb-preflight', 'retrieval-report.json'),
    JSON.stringify({ before, after }, null, 2),
  )
  for (const s of [before, after]) {
    console.log(`\n== ${s.label}`)
    const k = s.knowledge,
      c = s.chat313
    console.log(
      `knowledge (${k.n}): top-1 correct authority ${k.top1Authority}, verified passage of that authority in top-5 ${k.verifiedInTop5}, top-1 cites a verified source ${k.sourceVerified}, expected fact in retrieved excerpts ${k.factInExcerpts}/${k.factQuestions}`,
    )
    console.log(
      `  per language ${JSON.stringify(s.perLang)}  per authority ${JSON.stringify(s.perAuthority)}`,
    )
    console.log(
      `chat313 RAG routing (${c.n}): correct ${c.routedCorrect}, wrong ${c.routedWrong}, none ${c.routedNone}; no-authority cases ${c.noAuthorityExpected} → routed anyway ${c.routedWhenNoneExpected}`,
    )
    console.log(
      `outdated passages returned ${s.outdatedReturned}, inactive returned ${s.inactiveReturned}`,
    )
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
