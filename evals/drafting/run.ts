/**
 * Complaint-drafting evaluation runner.
 *
 *   npx tsx evals/drafting/run.ts --engine rules            # new deterministic builder
 *   npx tsx evals/drafting/run.ts --engine old --old-file f # letters from the pre-change builder
 *   npx tsx evals/drafting/run.ts --engine stress           # validator vs injected hallucinations
 *   npx tsx evals/drafting/run.ts --engine ai --live --max-neurons 2500 [--split holdout] [--ids A,B]
 *
 * --engine ai calls the real Llama 4 Scout through lib/ai/cloudflare.ts and
 * needs CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN for the real API in the
 * environment. It stops before the neuron cap is exceeded (per-case usage is
 * measured from Cloudflare's reported tokens) and on any provider error rate.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { buildDraftingCases } from './cases.mjs'
import { finalInputs, qualityScore, scoreLetter } from './score.mjs'
import { buildRulesLetter, draftComplaintLetter } from '@/lib/complaints/drafting/pipeline'
import { buildSources, groundFacts } from '@/lib/complaints/drafting/facts'
import { validateDraft } from '@/lib/complaints/drafting/validate'
import { entityDisplayName } from '@/lib/mock/government-entities'
import { ENTITY_NAME_TO_SECTOR } from '@/lib/complaints/sectors'

type Case = ReturnType<typeof buildDraftingCases>[number]
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const flag = (name: string) => process.argv.includes(`--${name}`)
const engine = arg('engine') ?? 'rules'
const split = arg('split') ?? 'all'
const ids = arg('ids')?.split(',')
const out = arg('out')
const maxNeurons = Number(arg('max-neurons') ?? 0)

let cases: Case[] = buildDraftingCases()
if (split !== 'all') cases = cases.filter((c) => c.split === split)
if (ids) cases = cases.filter((c) => ids.includes(c.id))

const NAME = { ar: 'مستخدم تجريبي', en: 'Test User' }

function rulesLetter(c: Case): string {
  const f = finalInputs(c)
  return buildRulesLetter({
    locale: f.locale,
    entityName: c.entityName,
    fullName: NAME[f.locale as 'ar' | 'en'],
    collectedFields: f.fields,
    userMessages: f.turns,
  }).complaintText
}

type Row = {
  id: string
  entity: string
  split: string
  locale: string
  categories: string[]
  letter: string
  checks: ReturnType<typeof scoreLetter>['checks']
  quality: number
  meta?: unknown
}

function summarize(rows: Row[]) {
  const passCase = (r: Row) =>
    r.checks.every((c) => c.ok || c.severity === 'low' || c.severity === 'medium')
  const group = (key: (r: Row) => string[]) => {
    const m = new Map<string, Row[]>()
    for (const r of rows) for (const k of key(r)) m.set(k, [...(m.get(k) ?? []), r])
    return Object.fromEntries(
      [...m].map(([k, rs]) => [
        k,
        {
          n: rs.length,
          pass: rs.filter(passCase).length,
          quality: Math.round((rs.reduce((s, r) => s + r.quality, 0) / rs.length) * 10) / 10,
        },
      ]),
    )
  }
  const byCheck: Record<string, { ok: number; n: number }> = {}
  for (const r of rows)
    for (const c of r.checks) {
      byCheck[c.name] ??= { ok: 0, n: 0 }
      byCheck[c.name].n++
      if (c.ok) byCheck[c.name].ok++
    }
  return {
    cases: rows.length,
    casesPassed: rows.filter(passCase).length,
    quality:
      Math.round((rows.reduce((s, r) => s + r.quality, 0) / Math.max(1, rows.length)) * 10) / 10,
    criticalFailures: rows.flatMap((r) =>
      r.checks
        .filter((c) => !c.ok && c.severity === 'critical')
        .map((c) => `${r.id} ${c.name} ${c.detail}`),
    ),
    byCheck,
    byLanguage: group((r) => [r.locale]),
    byAuthority: group((r) => [r.entity]),
    byCategory: group((r) => r.categories),
    bySplit: group((r) => [r.split]),
  }
}

function report(rows: Row[], extra: Record<string, unknown> = {}) {
  const summary = { engine, split, ...extra, ...summarize(rows) }
  console.log(
    `engine=${engine} cases=${summary.cases} passed=${summary.casesPassed} quality=${summary.quality}`,
  )
  for (const [k, v] of Object.entries(summary.byCheck))
    console.log(`  ${k.padEnd(24)} ${v.ok}/${v.n}`)
  console.log('  language', JSON.stringify(summary.byLanguage))
  console.log('  authority', JSON.stringify(summary.byAuthority))
  console.log('  split', JSON.stringify(summary.bySplit))
  if (summary.criticalFailures.length)
    console.log('  CRITICAL:\n   ' + summary.criticalFailures.join('\n   '))
  if (out) writeFileSync(out, JSON.stringify({ summary, rows }, null, 1))
}

function row(c: Case, letter: string, meta?: unknown): Row {
  const { checks } = scoreLetter(c, letter)
  return {
    id: c.id,
    entity: c.entity,
    split: c.split,
    locale: finalInputs(c).locale,
    categories: c.categories,
    letter,
    checks,
    quality: qualityScore(checks),
    meta,
  }
}

/** Typical model hallucinations, injected into a valid body. */
const INJECTIONS: Record<string, { ar: string; en: string }> = {
  'invented-amount': {
    ar: 'وقد بلغت قيمة المطالبة 7345 ريالاً.',
    en: 'The amount claimed was 7345 SAR.',
  },
  'invented-count': { ar: 'وقد تواصلت معهم ثلاث مرات.', en: 'I contacted them three times.' },
  'invented-damage': {
    ar: 'وقد تسبب ذلك في أضرار مالية كبيرة.',
    en: 'This caused me significant financial damage.',
  },
  'invented-legal': {
    ar: 'ويعد ذلك مخالفة صريحة للنظام.',
    en: 'This is a clear violation of the regulations.',
  },
  'invented-evidence': { ar: 'وأرفقت صور الفواتير.', en: 'I have attached photos of the bills.' },
  'invented-authority': {
    ar: 'كما راجعت وزارة الكهرباء بهذا الشأن.',
    en: 'I also contacted the Ministry of Electricity.',
  },
  'invented-contact-info': {
    ar: 'للتواصل: https://example.gov.sa',
    en: 'Contact: https://example.gov.sa',
  },
  'invented-accusation': {
    ar: 'وأرى أن هناك احتيالاً متعمداً.',
    en: 'I believe this was deliberate fraud.',
  },
}

async function main() {
  if (engine === 'rules') return report(cases.map((c) => row(c, rulesLetter(c))))
  if (engine === 'old') {
    const old = JSON.parse(readFileSync(arg('old-file')!, 'utf8')) as Record<string, string>
    return report(cases.map((c) => row(c, old[c.id])))
  }
  if (engine === 'stress') {
    let falsePositives = 0
    const fp: string[] = []
    const caught: Record<string, number> = {}
    for (const c of cases) {
      const f = finalInputs(c)
      const sources = buildSources(f.turns, f.fields, {})
      const facts = groundFacts({}, sources, ENTITY_NAME_TO_SECTOR[c.entityName] ?? null)
      const letter = rulesLetter(c).split('\n')
      const body = letter
        .filter(
          (l) => !/^(?:إلى|To|الموضوع|Subject|الاسم|Name):|^(?:السلام|Dear|وتفضلوا|Yours)/.test(l),
        )
        .join('\n')
        .trim()
      const ctx = {
        userCorpus: sources.map((s) => s.text).join('\n'),
        facts,
        authorityNames: [c.entityName, entityDisplayName(c.entityName, 'en')],
        allowedNames: [f.fields.service_provider, f.fields.merchant_name].filter(
          Boolean,
        ) as string[],
        locale: f.locale as 'ar' | 'en',
      }
      const base = validateDraft({ subject: 'شكوى', body }, ctx)
      if (!base.ok) {
        falsePositives++
        fp.push(
          `${c.id}: ${base.issues
            .filter((i) => i.severity !== 'minor')
            .map((i) => `${i.code}(${i.detail})`)
            .join(' ')}`,
        )
      }
      for (const [name, text] of Object.entries(INJECTIONS)) {
        const injected = validateDraft(
          { subject: 'شكوى', body: `${body}\n\n${text[f.locale as 'ar' | 'en']}` },
          ctx,
        )
        if (injected.issues.some((i) => i.severity === 'critical'))
          caught[name] = (caught[name] ?? 0) + 1
      }
    }
    console.log(
      `validator stress: ${cases.length} cases × ${Object.keys(INJECTIONS).length} injections`,
    )
    for (const name of Object.keys(INJECTIONS))
      console.log(`  caught ${name.padEnd(22)} ${caught[name] ?? 0}/${cases.length}`)
    console.log(
      `  clean fallback bodies rejected (false positives): ${falsePositives}/${cases.length}`,
    )
    if (fp.length) console.log('   ' + fp.slice(0, 30).join('\n   '))
    if (out)
      writeFileSync(out, JSON.stringify({ caught, falsePositives, fp, n: cases.length }, null, 1))
    return
  }
  if (engine === 'ai') {
    if (!flag('live') || !maxNeurons)
      throw new Error('--engine ai needs --live and --max-neurons N')
    const rows: Row[] = []
    let neurons = 0
    let errors = 0
    for (const c of cases) {
      if (neurons + 400 > maxNeurons) {
        console.log(`stopping: neuron budget ${maxNeurons} reached (${neurons} used)`)
        break
      }
      const first = await draftComplaintLetter({
        locale: c.locale as 'ar' | 'en',
        entityName: c.entityName,
        fullName: NAME[c.locale as 'ar' | 'en'],
        collectedFields: c.fields,
        userMessages: c.turns,
      })
      let result = first
      neurons += first.meta.neurons
      if (c.edit) {
        const f = finalInputs(c)
        result = await draftComplaintLetter({
          locale: f.locale as 'ar' | 'en',
          entityName: c.entityName,
          fullName: NAME[f.locale as 'ar' | 'en'],
          collectedFields: f.fields,
          userMessages: f.turns,
          style: f.style as 'standard' | 'shorter' | 'more_formal',
          previousFacts: c.edit.fields ? null : first.facts,
        })
        neurons += result.meta.neurons
      }
      if (
        result.meta.fallbackReason === 'extraction_failed' ||
        result.meta.fallbackReason === 'draft_failed'
      )
        errors++
      const r = row(c, result.letter.complaintText, { ...result.meta, facts: result.facts })
      rows.push(r)
      console.log(
        `${c.id} path=${result.meta.path} q=${r.quality} ${result.meta.ms.total}ms n=${result.meta.neurons}`,
      )
      if (errors >= 3) {
        console.log('stopping: repeated provider errors')
        break
      }
    }
    return report(rows, { neuronsUsed: neurons })
  }
  throw new Error(`unknown engine ${engine}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
