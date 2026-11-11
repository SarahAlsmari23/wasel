/**
 * Intent-routing evaluation (offline, deterministic — no model, no retrieval).
 *   npx tsx evals/intent/run.ts [--split dev|holdout|all] [--verbose]
 *
 * "before" = the previous deterministic decision: the out-of-scope shortcut
 * only when no sector word was mentioned, and an authority selected from the
 * sector keyword alone. It cannot include the previous nearest-document
 * retrieval routing (needs embeddings), so it *understates* the old false
 * selections. "after" = assessIntent + allowsRouting.
 */
import { buildIntentCases } from './cases.mjs'
import { allowsRouting, assessIntent } from '@/lib/ai/intent'
import { detectSectorByKeyword, mentionsSupportedSector } from '@/lib/ai/entity-detection'
import { isGreetingOnly, isIdentityQuestion, isObviousOutOfScope } from '@/lib/ai/intent-guards'

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const split = arg('split') ?? 'all'
const verbose = process.argv.includes('--verbose')
type Turn = { text: string; kinds: string[]; sector: string | null }
type Case = { id: string; group: string; register: string; split: string; turns: Turn[] }
let cases = buildIntentCases() as unknown as Case[]
if (split !== 'all') cases = cases.filter((c) => c.split === split)

function before(text: string): string | null {
  if (
    !mentionsSupportedSector(text) &&
    (isGreetingOnly(text) || isIdentityQuestion(text) || isObviousOutOfScope(text))
  ) {
    return null
  }
  return detectSectorByKeyword(text)
}
function after(text: string) {
  const a = assessIntent(text)
  return { kind: a.kind, authority: allowsRouting(a.kind) ? a.sector : null, reasons: a.reasons }
}

type Tally = { n: number; ok: number }
const t = () => ({ n: 0, ok: 0 })
const m = {
  turns: 0,
  kindOk: 0,
  after: { authority: t(), falseAuthority: t(), missedAuthority: t() },
  before: { authority: t(), falseAuthority: t(), missedAuthority: t() },
  byGroup: {} as Record<string, { before: Tally; after: Tally; kind: Tally }>,
  bySplit: {} as Record<string, { before: Tally; after: Tally; kind: Tally }>,
  bug: [] as string[],
  failures: [] as string[],
}
for (const c of cases) {
  for (const turn of c.turns) {
    const a = after(turn.text)
    const b = before(turn.text)
    const expected = turn.sector as string | null
    const anySector = expected === 'any'
    const kindOk = (turn.kinds as string[]).includes(a.kind)
    const authOk = (got: string | null) => anySector || got === expected
    m.turns++
    if (kindOk) m.kindOk++
    for (const [name, got] of [
      ['after', a.authority],
      ['before', b],
    ] as const) {
      const r = m[name]
      r.authority.n++
      if (authOk(got)) r.authority.ok++
      if (!anySector && expected === null) {
        r.falseAuthority.n++
        if (got !== null) r.falseAuthority.ok++
      }
      if (!anySector && expected !== null) {
        r.missedAuthority.n++
        if (got === null) r.missedAuthority.ok++
      }
    }
    for (const [key, bucket] of [
      [c.group, m.byGroup],
      [c.split, m.bySplit],
    ] as const) {
      bucket[key] ??= { before: t(), after: t(), kind: t() }
      bucket[key].before.n++
      bucket[key].after.n++
      bucket[key].kind.n++
      if (authOk(b)) bucket[key].before.ok++
      if (authOk(a.authority)) bucket[key].after.ok++
      if (kindOk) bucket[key].kind.ok++
    }
    if (c.id === 'BUG-PROD')
      m.bug.push(`${turn.text} → before:${b ?? 'none'} after:${a.kind}/${a.authority ?? 'none'}`)
    if (!kindOk || !authOk(a.authority)) {
      m.failures.push(
        `${c.id} [${c.split}] "${turn.text}" expected ${turn.kinds.join('|')}/${expected} got ${a.kind}/${a.authority} (${a.reasons.join(',')})`,
      )
    }
  }
}
const pct = (x: Tally) => `${x.ok}/${x.n} (${x.n ? ((100 * x.ok) / x.n).toFixed(1) : '–'}%)`
console.log(`intent evaluation — cases=${cases.length} turns=${m.turns} split=${split}`)
console.log(`  kind accuracy (after)            ${pct({ n: m.turns, ok: m.kindOk })}`)
console.log(
  `  correct authority decision       before ${pct(m.before.authority)}   after ${pct(m.after.authority)}`,
)
console.log(
  `  authority selected when none due before ${pct(m.before.falseAuthority)}   after ${pct(m.after.falseAuthority)}`,
)
console.log(
  `  no authority when one was due    before ${pct(m.before.missedAuthority)}   after ${pct(m.after.missedAuthority)}`,
)
for (const [k, v] of Object.entries(m.bySplit))
  console.log(
    `  split ${k.padEnd(8)} before ${pct(v.before)} after ${pct(v.after)} kind ${pct(v.kind)}`,
  )
for (const [k, v] of Object.entries(m.byGroup))
  console.log(
    `  group ${k.padEnd(13)} before ${pct(v.before)} after ${pct(v.after)} kind ${pct(v.kind)}`,
  )
console.log('  production bug sequence:\n    ' + m.bug.join('\n    '))
console.log(`  failures (${m.failures.length}):`)
for (const f of verbose ? m.failures : m.failures.filter((x) => x.includes('[dev]')))
  console.log('    ' + f)
if (!verbose)
  console.log(
    `    (+${m.failures.filter((x) => x.includes('[holdout]')).length} holdout failures hidden; --verbose to show)`,
  )
