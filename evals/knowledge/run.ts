/**
 * Government-knowledge evaluation (offline, deterministic).
 *   npx tsx evals/knowledge/run.ts [--split dev|holdout|all] [--verbose]
 *
 * Questions are generated ONLY from verified facts (data/government/
 * authorities.json) — every expected answer is traceable to an official page
 * and quote — plus "unanswerable" questions about facts the official sources
 * do not publish. For each question it checks:
 *   1. routing   — the intent layer selects the correct authority;
 *   2. grounding — the verified fact reaches the model (the prompt's official
 *      facts block for that authority contains the expected value and its
 *      source URL);
 *   3. abstention — for unpublished facts, no value is supplied and the block
 *      explicitly marks it as not published.
 * Retrieval quality of the vector index and live answer faithfulness are NOT
 * measured here (they need the Workers AI credentials / a live deployment).
 */
import { allowsRouting, assessIntent } from '@/lib/ai/intent'
import { allProfiles, profilePromptBlock } from '@/lib/government/profiles'
import { getEntityNameForSector } from '@/lib/ai/entity-detection'

import { questions } from './questions'

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const split = arg('split') ?? 'all'
const verbose = process.argv.includes('--verbose')
const SECTOR_OF: Record<string, string> = {
  nwc: 'water',
  sec: 'electricity',
  cst: 'telecom',
  mc: 'commerce',
  balady: 'municipality',
}

let qs = questions()
if (split !== 'all') qs = qs.filter((q) => q.split === split)
const tally = (k: string, m: Record<string, { n: number; ok: number }>, ok: boolean) => {
  m[k] ??= { n: 0, ok: 0 }
  m[k].n++
  if (ok) m[k].ok++
}
const routing: Record<string, { n: number; ok: number }> = {}
const grounding: Record<string, { n: number; ok: number }> = {}
const byLang: Record<string, { n: number; ok: number }> = {}
const failures: string[] = []
for (const q of qs) {
  const a = assessIntent(q.question)
  const routed = allowsRouting(a.kind) ? a.sector : null
  const routeOk = routed === SECTOR_OF[q.authority]
  tally(q.kind, routing, routeOk)
  // Grounding uses the authority actually selected (wrong/none routing → no facts).
  const profile = routed
    ? (allProfiles().find((p) => p.dbName === getEntityNameForSector(routed)) ?? null)
    : null
  const block = profile ? profilePromptBlock(profile, q.question, q.lang) : ''
  const groundOk =
    q.kind === 'unanswerable'
      ? block.includes(q.expect[0]) // listed as not published → abstain
      : q.expect.every((e) => block.includes(e)) && (!q.sourceUrl || block.includes(q.sourceUrl))
  tally(q.kind, grounding, groundOk)
  tally(q.lang, byLang, routeOk && groundOk)
  if (!routeOk || !groundOk)
    failures.push(
      `${q.id} [${q.split}] ${q.kind} route=${routed}${routeOk ? '' : '✗'} ground=${groundOk ? 'ok' : '✗'} «${q.question}»`,
    )
}
const pct = (x: { n: number; ok: number }) => `${x.ok}/${x.n} (${((100 * x.ok) / x.n).toFixed(1)}%)`
const sum = (m: Record<string, { n: number; ok: number }>) =>
  Object.values(m).reduce((s, x) => ({ n: s.n + x.n, ok: s.ok + x.ok }), { n: 0, ok: 0 })
console.log(`knowledge evaluation — questions=${qs.length} split=${split}`)
console.log(`  routing to the correct authority   ${pct(sum(routing))}`)
console.log(`  verified fact + source reach model ${pct(sum(grounding))}`)
for (const k of Object.keys(routing))
  console.log(`  ${k.padEnd(15)} routing ${pct(routing[k])}  grounding ${pct(grounding[k])}`)
for (const k of Object.keys(byLang)) console.log(`  language ${k}  both ${pct(byLang[k])}`)
console.log(`  failures (${failures.length}):`)
for (const f of verbose ? failures : failures.filter((x) => x.includes('[dev]')))
  console.log('    ' + f)
