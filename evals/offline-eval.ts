/**
 * Offline evaluation of Wasel's deterministic layers against evals/dataset.json.
 * No network, no model, no database: it calls the real functions the chat
 * route and complaint actions use.
 *
 *   npx tsx evals/offline-eval.ts [--split dev|holdout|all] [--json out.json]
 *
 * Layers scored:
 *   guards    greeting / identity / out-of-scope pre-guards (no false positives
 *             on real complaints; coverage on their own categories)
 *   keyword   deterministic sector fallback (never a wrong authority; never a
 *             supported authority for out-of-scope / unsupported messages)
 *   signal    complaint/grievance detection on complaint cases
 *   letters   complaint letters: every number, date and name the user gave is
 *             kept; no number the user did not give appears; no unsupported
 *             claim; authority and name present; regeneration replaces facts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { detectSectorByKeyword } from '@/lib/ai/entity-detection'
import {
  hasGrievanceSignal,
  isGreetingOnly,
  isIdentityQuestion,
  isObviousOutOfScope,
} from '@/lib/ai/intent-guards'
import { describesProblem, isInformationQuestion } from '@/lib/ai/problem-signal'
import { buildFormalComplaintLetter } from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'
import { hasSectorIssueSignal } from '@/lib/complaints/issue-signal'
import type { Sector } from '@/lib/complaints/sectors'
import { wantsToCreateComplaint } from '@/lib/wasal/complaint-intent'

type Route = string | { anyOf: string[] }
type Case = {
  id: string
  entity: string | null
  category: string
  language: 'ar' | 'en'
  register: string
  turns: string[]
  severity: string
  split: 'dev' | 'holdout'
  expected: {
    route: Route
    intent: string
    clarify: boolean | null
    letter: null | { locale: 'ar' | 'en'; fullName: string; fields: Record<string, string> }
  }
}

const args = process.argv.slice(2)
const split = args.includes('--split') ? args[args.indexOf('--split') + 1] : 'all'
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null

const dataset = JSON.parse(readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'))
const ENTITIES: Record<string, { nameAr: string }> = dataset.entities
const cases: Case[] = dataset.cases.filter((c: Case) => split === 'all' || c.split === split)

const SECTOR_TO_CODE: Record<Sector, string> = {
  electricity: 'sec',
  water: 'nwc',
  telecom: 'cst',
  commerce: 'mc',
  municipality: 'balady',
}

type Result = {
  id: string
  layer: string
  ok: boolean
  severity: string
  detail: string
  category: string
  language: string
  entity: string | null
  split: string
}
const results: Result[] = []
const record = (c: Case, layer: string, ok: boolean, detail: string, severity = c.severity) =>
  results.push({
    id: c.id,
    layer,
    ok,
    severity,
    detail,
    category: c.category,
    language: c.language,
    entity: c.entity,
    split: c.split,
  })

/** The message whose topic decides routing: the last turn that names a topic
 * (corrections like "لا قصدي الموية" win), else the first turn. */
function routingMessage(turns: string[]): string {
  for (let i = turns.length - 1; i >= 0; i--) if (detectSectorByKeyword(turns[i])) return turns[i]
  return turns[0]
}

// ── Guards, keyword fallback, complaint signal ────────────────────────────────
for (const c of cases) {
  if (c.turns.length === 0) continue
  const first = c.turns[0]
  const intent = c.expected.intent

  // Pre-guards must never swallow a genuine complaint or government question.
  const governmentCase =
    !['out_of_scope', 'greeting', 'identity'].includes(intent) && c.category !== 'out_of_scope'
  if (governmentCase && intent !== 'refuse') {
    const fired = c.turns.flatMap((t, i) =>
      [
        isGreetingOnly(t) && i === 0 && c.turns.length === 1 ? 'greeting' : null,
        isIdentityQuestion(t) ? 'identity' : null,
        isObviousOutOfScope(t) ? 'out_of_scope' : null,
      ].filter(Boolean),
    )
    record(
      c,
      'guards:no-false-positive',
      fired.length === 0,
      fired.join(',') || 'none fired',
      'high',
    )
  }
  if (intent === 'greeting')
    record(
      c,
      'guards:greeting',
      isGreetingOnly(first),
      `isGreetingOnly=${isGreetingOnly(first)}`,
      'low',
    )
  if (intent === 'identity')
    record(
      c,
      'guards:identity',
      isIdentityQuestion(first),
      `isIdentityQuestion=${isIdentityQuestion(first)}`,
      'low',
    )
  if (intent === 'out_of_scope') {
    // Coverage only: the guard is deliberately narrow and the model handles
    // the rest, so a miss here is informational, not a failure.
    results.push({
      id: c.id,
      layer: 'guards:out-of-scope-coverage',
      ok: isObviousOutOfScope(first),
      severity: 'info',
      detail: `guard=${isObviousOutOfScope(first)}`,
      category: c.category,
      language: c.language,
      entity: c.entity,
      split: c.split,
    })
  }

  // Keyword fallback: correct, silent, or wrong.
  const msg = routingMessage(c.turns)
  const sector = detectSectorByKeyword(msg)
  const got = sector ? SECTOR_TO_CODE[sector] : null
  const route = c.expected.route
  let ok = true
  let why = `keyword=${got ?? 'none'}`
  if (typeof route === 'string' && ENTITIES[route]) {
    ok = got === null || got === route
    if (!ok) why += ` expected ${route} (wrong authority)`
  } else if (typeof route === 'object') {
    ok = got === null || route.anyOf.includes(got)
    if (!ok) why += ` expected one of ${route.anyOf.join('/')}`
  } else if (route === 'none') {
    ok = got === null
    if (!ok) why += ' expected no supported authority'
  } else if (route === 'clarify') {
    ok = got === null || c.turns.length > 1
    if (!ok) why += ' expected clarification before routing'
  }
  record(c, 'keyword:no-misroute', ok, why)
  if (typeof route === 'string' && ENTITIES[route]) {
    results.push({
      id: c.id,
      layer: 'keyword:coverage',
      ok: got === route,
      severity: 'info',
      detail: why,
      category: c.category,
      language: c.language,
      entity: c.entity,
      split: c.split,
    })
  }

  // The telecom/commerce "what exactly is the problem?" gate must not fire
  // when the user already named the problem or asked an information question.
  const gateSector: Record<string, Sector> = { cst: 'telecom', mc: 'commerce' }
  if (
    typeof route === 'string' &&
    gateSector[route] &&
    !['incomplete', 'ambiguous'].includes(c.category)
  ) {
    const last = c.turns[c.turns.length - 1]
    const skips =
      hasSectorIssueSignal(gateSector[route], c.turns.join(' ')) || isInformationQuestion(last)
    record(
      c,
      'gate:no-redundant-question',
      skips,
      skips ? 'ok' : 'would ask for the problem type again',
      'high',
    )
  }

  // Complaint signal: a described problem should start the complaint flow…
  if (intent === 'complaint') {
    const any = c.turns.some(
      (t) => hasGrievanceSignal(t) || describesProblem(t) || wantsToCreateComplaint(t),
    )
    record(c, 'signal:complaint-detected', any, `grievance/problem/create=${any}`, 'medium')
  }
  // …and a plain information question must not start it (describesProblem
  // opens complaint-detail collection in the chat route).
  if (c.expected.clarify === false && intent !== 'complaint' && c.turns.length === 1) {
    record(
      c,
      'signal:no-false-complaint',
      !describesProblem(first),
      `describesProblem=${describesProblem(first)}`,
      'medium',
    )
  }
}

// ── Letters ───────────────────────────────────────────────────────────────────
const NUMBER = /\d[\d,.]*/g
const normaliseNumber = (s: string) => s.replace(/[,.]$/, '').replace(/,/g, '')
function numbersIn(text: string): Set<string> {
  return new Set((text.match(NUMBER) ?? []).map(normaliseNumber).filter((n) => n.length > 0))
}
// Claims a letter must not add unless the user's own words support them.
const UNSUPPORTED_CLAIMS: { pattern: RegExp; supportedBy: RegExp; label: string }[] = [
  {
    pattern: /إعادة التيار|تعذر الاستفادة من التيار/,
    supportedBy: /انقطاع|مقطوع|انقطع|طاف|تطفي|ينقطع/,
    label: 'claims a power cut',
  },
  {
    pattern: /إعادة (ضخ )?المياه|انقطاع المياه/,
    supportedBy: /انقطاع|مقطوع|انقطع|قطعوا/,
    label: 'claims a water cut',
  },
  {
    pattern: /ضرر مادي|أضرار مادية/,
    supportedBy: /ضرر|أضرار|تلف|خسار|خرب|ريال|SAR|مبلغ|دفعت/,
    label: 'claims material damage',
  },
  {
    pattern: /دون وجه حق/,
    supportedBy: /دون وجه حق|ظلم|غير مبرر|بدون سبب/,
    label: 'asserts wrongdoing',
  },
  {
    pattern: /power (cut|outage)|restore (the )?power/i,
    supportedBy: /outage|cut|no power|blackout/i,
    label: 'claims a power cut',
  },
]

function checkLetter(
  c: Case,
  letter: { subject: string; complaintText: string },
  fields: Record<string, string>,
  fullName: string,
  label: string,
) {
  const text = `${letter.subject}\n${letter.complaintText}`
  const input = Object.values(fields).join(' \n ')
  const inputNumbers = numbersIn(input)
  const letterNumbers = numbersIn(text)
  const lost = [...inputNumbers].filter((n) => !letterNumbers.has(n))
  const invented = [...letterNumbers].filter((n) => !inputNumbers.has(n))
  record(
    c,
    `letters:${label}:keeps-numbers-and-dates`,
    lost.length === 0,
    lost.length ? `lost ${lost.join(', ')}` : 'all kept',
    'high',
  )
  record(
    c,
    `letters:${label}:no-invented-numbers`,
    invented.length === 0,
    invented.length ? `invented ${invented.join(', ')}` : 'none',
    'critical',
  )
  const names = [
    'city',
    'merchant_name',
    'location_or_address',
    'service_provider',
    'account_or_meter_number',
  ]
    .map((k) => fields[k])
    .filter(Boolean) as string[]
  const lostNames = names.filter((n) => !text.includes(n))
  record(
    c,
    `letters:${label}:keeps-names-and-places`,
    lostNames.length === 0,
    lostNames.length ? `lost ${lostNames.join(' | ')}` : 'all kept',
    'high',
  )
  record(c, `letters:${label}:names-person`, text.includes(fullName), 'full name present', 'high')
  const claims = UNSUPPORTED_CLAIMS.filter(
    (u) => u.pattern.test(text) && !u.supportedBy.test(input),
  ).map((u) => u.label)
  record(
    c,
    `letters:${label}:no-unsupported-claims`,
    claims.length === 0,
    claims.join(', ') || 'none',
    'critical',
  )
  const dangling = /حدثت هذه المشكلة،|occurred on \.|في مدينة \.|،\s*،/.test(text)
  record(
    c,
    `letters:${label}:no-broken-sentences`,
    !dangling,
    dangling ? 'dangling clause' : 'ok',
    'medium',
  )
  return text
}

const letterSamples: Record<string, string> = {}
for (const c of cases) {
  const spec = c.expected.letter
  if (!spec) continue
  const entity = ENTITIES[c.expected.route as string]
  const build = (fields: Record<string, string>) =>
    (spec.locale === 'en' ? buildEnglishFormalComplaintLetter : buildFormalComplaintLetter)({
      entityName: entity.nameAr,
      fullName: spec.fullName,
      collectedFields: fields,
    })
  const letter = build(spec.fields)
  letterSamples[c.id] = checkLetter(c, letter, spec.fields, spec.fullName, 'v1')
  const authority =
    spec.locale === 'en'
      ? /To: \S/.test(letter.complaintText)
      : letter.complaintText.includes(entity.nameAr)
  record(c, 'letters:v1:names-authority', authority, 'authority line', 'high')

  // Regeneration: change the city / place / amount and check nothing stale remains.
  const edited: Record<string, string> = { ...spec.fields }
  const stale: string[] = []
  if (edited.city) {
    stale.push(edited.city)
    edited.city = spec.locale === 'en' ? 'Medina' : 'المدينة المنورة'
  }
  if (edited.location_or_address) {
    stale.push(edited.location_or_address)
    edited.location_or_address = spec.locale === 'en' ? 'King Fahd Road' : 'طريق الملك فهد'
  }
  if (edited.merchant_name) {
    stale.push(edited.merchant_name)
    edited.merchant_name = spec.locale === 'en' ? 'NewStore' : 'متجر النخبة'
  }
  const v2 = build(edited)
  const v2Text = checkLetter(c, v2, edited, spec.fullName, 'v2')
  const staleLeft = stale.filter((s) => v2Text.includes(s))
  record(
    c,
    'letters:regeneration:no-stale-content',
    staleLeft.length === 0,
    staleLeft.length ? `stale ${staleLeft.join(' | ')}` : 'clean',
    'high',
  )
}

// ── Report ────────────────────────────────────────────────────────────────────
const scored = results.filter((r) => r.severity !== 'info')
const byLayer = new Map<string, { pass: number; total: number }>()
for (const r of results) {
  const key = r.layer.replace(/:v[12]:/, ':')
  const v = byLayer.get(key) ?? { pass: 0, total: 0 }
  v.total++
  if (r.ok) v.pass++
  byLayer.set(key, v)
}
const pct = (p: number, t: number) => (t ? `${((100 * p) / t).toFixed(1)}%` : '—')
console.log(`Offline evaluation — split=${split}, cases=${cases.length}, checks=${results.length}`)
for (const [layer, v] of [...byLayer].sort())
  console.log(
    `  ${layer.padEnd(44)} ${String(v.pass).padStart(4)}/${String(v.total).padEnd(4)} ${pct(v.pass, v.total)}`,
  )
const failed = scored.filter((r) => !r.ok)
console.log(
  `\nScored checks: ${scored.length - failed.length}/${scored.length} passed (${pct(scored.length - failed.length, scored.length)}); failures by severity: ${JSON.stringify(failed.reduce((a, r) => ({ ...a, [r.severity]: (a[r.severity] ?? 0) + 1 }), {} as Record<string, number>))}`,
)
for (const lang of ['ar', 'en']) {
  const s = scored.filter((r) => r.language === lang)
  console.log(`  ${lang}: ${pct(s.filter((r) => r.ok).length, s.length)} of ${s.length}`)
}
for (const e of [...Object.keys(ENTITIES), null]) {
  const s = scored.filter((r) => r.entity === e)
  console.log(
    `  ${(e ?? 'cross').padEnd(7)} ${pct(s.filter((r) => r.ok).length, s.length)} of ${s.length}`,
  )
}
console.log('\nFailures:')
for (const r of failed) console.log(`  [${r.severity}] ${r.id} ${r.layer} :: ${r.detail}`)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ split, results, letterSamples }, null, 1))
