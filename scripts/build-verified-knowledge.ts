/**
 * Generates reviewed knowledge passages from data/government/authorities.json
 * into data/knowledge/verified-2026-11/<sector>.json (one idea per passage,
 * each citing the exact official page it came from). Deterministic — rerun
 * after editing the profiles, review the diff, then ingest:
 *
 *   npx tsx scripts/build-verified-knowledge.ts
 *   npm run ingest:knowledge -- --dir data/knowledge/verified-2026-11 --dry-run
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import data from '../data/government/authorities.json'
import { allProfiles, getProfileSource, PROFILES_VERIFIED_AT } from '../lib/government/profiles'

const SECTOR: Record<string, string> = {
  nwc: 'water',
  sec: 'electricity',
  cst: 'telecom',
  mc: 'commerce',
  balady: 'municipality',
}
const OUT = join(process.cwd(), 'data', 'knowledge', 'verified-2026-11')
const KB_VERSION = 'verified-2026-11'
const MAX = 500

type Entry = {
  title: string
  content: string
  entity: string
  sector: string
  documentType: string
  sourceUrl: string
  sourceLabel: string
  reviewedAt: string
  sourceId: string
  quote: string
  kbVersion: string
}

function chunk(lines: string[], max = MAX): string[] {
  const out: string[] = []
  let cur = ''
  for (const line of lines) {
    if (cur && (cur + ' ' + line).length > max) {
      out.push(cur)
      cur = line
    } else cur = cur ? `${cur} ${line}` : line
  }
  if (cur) out.push(cur)
  return out
}

mkdirSync(OUT, { recursive: true })
for (const p of allProfiles()) {
  const sector = SECTOR[p.code]
  const entries: Entry[] = []
  const add = (
    title: string,
    content: string,
    documentType: string,
    sourceId: string,
    quote: string,
  ) => {
    const src = getProfileSource(sourceId)
    if (!src) throw new Error(`unverified source ${sourceId}`)
    const parts = chunk([content])
    parts.forEach((part, i) =>
      entries.push({
        title: parts.length > 1 ? `${title} (${i + 1})` : title,
        content: part,
        entity: p.dbName,
        sector,
        documentType,
        sourceUrl: src.url,
        sourceLabel: src.title,
        reviewedAt: PROFILES_VERIFIED_AT,
        sourceId,
        quote,
        kbVersion: KB_VERSION,
      }),
    )
  }
  const name = p.officialNameAr.value
  if (p.scope) {
    add(
      `اختصاص ${p.dbName}`,
      `${p.dbName} (${name}${p.officialNameEn ? ` / ${p.officialNameEn.value}` : ''}): ${p.scope.ar}`,
      'general_info',
      p.scope.source,
      p.scope.quote,
    )
  }
  // Channels: one passage per source page, so each cites the page it came from.
  const bySource = new Map<string, typeof p.channels>()
  for (const c of p.channels) bySource.set(c.source, [...(bySource.get(c.source) ?? []), c])
  for (const [sourceId, channels] of bySource) {
    const lines = channels.map((c) => `${c.label.ar}: ${c.value}.`)
    add(
      `قنوات التواصل الرسمية — ${p.dbName}`,
      `القنوات الرسمية المنشورة لدى ${p.dbName}: ${lines.join(' ')}`,
      'official_channel',
      sourceId,
      channels[0].quote,
    )
  }
  for (const proc of p.procedures) {
    const lines: string[] = []
    for (const x of proc.prerequisites?.ar ?? []) lines.push(`شرط: ${x}.`)
    for (const x of proc.conditions?.ar ?? []) lines.push(`شرط: ${x}.`)
    proc.steps.ar.forEach((x, i) => lines.push(`${i + 1}) ${x}.`))
    for (const x of proc.documents?.ar ?? []) lines.push(`مستند: ${x}.`)
    for (const x of proc.requirements?.ar ?? []) lines.push(`متطلب: ${x}.`)
    if (proc.serviceTime) lines.push(`المدة المنشورة: ${proc.serviceTime.ar}.`)
    if (proc.publishedTimes) lines.push(`${proc.publishedTimes.ar}.`)
    if (proc.fee) lines.push(`الرسوم: ${proc.fee.ar}.`)
    if (proc.tip) lines.push(`${proc.tip.ar}.`)
    chunk(lines, MAX - 60).forEach((part, i, all) =>
      add(
        `${proc.title.ar} — ${p.dbName}${all.length > 1 ? ` (${i + 1}/${all.length})` : ''}`,
        `${proc.title.ar} لدى ${p.dbName}: ${part}`,
        'procedure',
        proc.source,
        proc.quote,
      ),
    )
  }
  for (const sl of p.serviceLevels ?? []) {
    add(
      `مستوى الخدمة: ${sl.item.ar} — ${p.dbName}`,
      `وفق اتفاقية مستوى الخدمة المنشورة لدى ${p.dbName}: ${sl.item.ar}: ${sl.value.ar}. التعويض المنشور عند الاستحقاق: ${sl.compensation.ar}.`,
      'service_level',
      sl.source,
      sl.quote,
    )
  }
  const raw = p as unknown as {
    rename?: { from: string; to: string; date: string; source: string; quote: string }
  }
  if (raw.rename) {
    add(
      `المسمى الحالي لـ ${p.dbName}`,
      `المسمى الحالي هو «${raw.rename.to}»، وكان سابقاً «${raw.rename.from}» (${raw.rename.date}).`,
      'general_info',
      raw.rename.source,
      raw.rename.quote,
    )
  }
  add(
    `معلومات غير منشورة رسمياً — ${p.dbName}`,
    `لم تُنشر في المصادر الرسمية التي تمت مراجعتها لدى ${p.dbName} المعلومات التالية، ولا ينبغي ذكرها أو تخمينها: ${p.notPublished.join('، ')}. للتحقق منها يُرجع إلى الموقع الرسمي: ${p.website}.`,
    'not_published',
    p.officialNameAr.source,
    p.officialNameAr.quote,
  )
  writeFileSync(join(OUT, `${sector}.json`), JSON.stringify(entries, null, 2) + '\n')
  console.log(`${sector}: ${entries.length} passages`)
}

// ── Reviewed SQL for official_sources (applied separately, see README) ──────
const sql: string[] = [
  '-- GENERATED by scripts/build-verified-knowledge.ts from data/government/authorities.json — do not edit by hand.',
  '-- Registers every verified official page as an official_sources row (idempotent by URL)',
  '-- and records the verification date on the existing home-page rows. Reversible: see 99_rollback.sql.',
  '-- One DO block: atomic, and accepted by both the hosted SQL API and a direct connection.',
  'do $kb$',
  'begin',
]
const q = (s: string | null) => (s === null ? 'null' : `'${s.replace(/'/g, "''")}'`)
for (const s of (
  data as unknown as {
    sources: {
      id: string
      authority: string
      url: string
      title: string
      language: string
      pageUpdated: string | null
      status: string
      note?: string
    }[]
  }
).sources) {
  const notes = `kb:verified-2026-11 id:${s.id} lang:${s.language}${s.pageUpdated ? ` page-updated:${s.pageUpdated}` : ''}${s.note ? ` note:${s.note}` : ''}`
  sql.push(
    `insert into public.official_sources (entity_id, service_id, source_name, source_url, source_type, verification_status, last_checked_at, notes)
select e.id, gs.id, ${q(s.title)}, ${q(s.url)}, 'official_webpage', ${q(s.status)}, '${PROFILES_VERIFIED_AT}T12:00:00+03:00', ${q(notes)}
from public.government_entities e left join public.government_services gs on gs.entity_id = e.id
where e.code = ${q(s.authority)}
  and not exists (select 1 from public.official_sources o where o.source_url = ${q(s.url)});`,
  )
}
sql.push(
  `update public.official_sources set last_checked_at = '${PROFILES_VERIFIED_AT}T12:00:00+03:00', notes = coalesce(notes || ' ', '') || 'home page re-checked ${PROFILES_VERIFIED_AT}'
where (notes is null or notes not like 'kb:verified-2026-11%') and coalesce(notes, '') not like '%home page re-checked%';`,
  'end',
  '$kb$;',
)
const SQL_DIR = join(process.cwd(), 'supabase', 'maintenance', 'knowledge-2026-11')
mkdirSync(SQL_DIR, { recursive: true })
writeFileSync(join(SQL_DIR, '01_official_sources.sql'), sql.join('\n\n') + '\n')
console.log(`01_official_sources.sql: ${sql.length - 7} inserts + 1 update`)
