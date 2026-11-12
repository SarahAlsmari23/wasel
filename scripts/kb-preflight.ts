/**
 * Knowledge-activation and latency PREFLIGHT — run by the owner, once, with
 * Workers AI credentials in the shell environment:
 *
 *   CLOUDFLARE_ACCOUNT_ID=…  CLOUDFLARE_API_TOKEN=…  npm run kb:preflight
 *
 * What it does (and nothing else):
 *   embed    — real 768-dimension embeddings (@cf/google/embeddinggemma-300m,
 *              the model of every existing row) for the 36 verified passages
 *              and for the evaluation queries, formatted exactly as
 *              scripts/ingest-knowledge.ts and lib/rag/retrieve.ts format them.
 *   latency  — a controlled Llama 4 Scout benchmark: the same five complaint
 *              prompts with no verified-facts block, the current (verbose)
 *              block and the compact block, interleaved and repeated.
 *   answers  — a small answer check: verified facts present, no unverified
 *              phone numbers / links, no invented numbers.
 *
 * It never reads .env files, never prints the token, never connects to any
 * database and only calls the official Cloudflare API (any
 * CLOUDFLARE_API_BASE_URL override is ignored). Results go to .kb-preflight/
 * (git-ignored; embeddings and timings only — no credentials, no user data).
 * Hard stop at --max-neurons (default 2500) using the usage Cloudflare reports.
 * WARNING: the allowance is shared with production — see MAX_NEURONS below.
 *
 *   --phase embed,latency,answers   (default: all three)
 *   --reps 2                        (latency repetitions per message and arm)
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { RESPONSE_JSON_SCHEMA } from '@/lib/ai/generation-shared'
import { buildPrompt } from '@/lib/ai/prompts'
import { sanitizeMessage } from '@/lib/ai/sanitize'
import { scrubUnverifiedContacts } from '@/lib/government/contact-check'
import {
  getAuthorityProfile,
  profilePromptBlock,
  verifiedContacts,
} from '@/lib/government/profiles'
import { questions } from '../evals/knowledge/questions'

const OUT = join(process.cwd(), '.kb-preflight')
const PASSAGE_DIR = join(process.cwd(), 'data', 'knowledge', 'verified-2026-11')
const EMBED_MODEL = '@cf/google/embeddinggemma-300m'
const CHAT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'
// Published Workers AI rates for Llama 4 Scout (neurons per million tokens).
const SCOUT_IN = 24_545
const SCOUT_OUT = 77_273

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const PHASES = (arg('phase') ?? 'embed,latency,answers').split(',')
const REPS = Number(arg('reps') ?? 2)
// The Workers AI allowance is SHARED with production (10,000 neurons/day on the
// free plan, reset 00:00 UTC). This cap only counts this run's own usage; on
// 2026-11-11 a run within its cap still exhausted the shared daily allowance
// and production chat returned HTTP 429 until the reset. Keep it small and run
// only when today's account usage leaves room for production traffic.
const MAX_NEURONS = Number(arg('max-neurons') ?? 2500)

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
if (!accountId || !token || (accountId === 'local-test' && !process.env.KB_PREFLIGHT_TEST_BASE)) {
  console.error(
    'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in this shell first (see the README).',
  )
  process.exit(1)
}
// Test hook for the local stub only (never a remote override).
const testBase = process.env.KB_PREFLIGHT_TEST_BASE?.trim()
if (testBase && !/^http:\/\/127\.0\.0\.1:\d+\//.test(testBase)) {
  console.error('KB_PREFLIGHT_TEST_BASE may only point at 127.0.0.1.')
  process.exit(1)
}
const BASE = `${testBase ?? 'https://api.cloudflare.com/client/v4/'}accounts/${accountId}/ai/v1`

let neurons = 0
let chatCalls = 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function post(path: string, body: unknown, timeoutMs = 40_000) {
  const t0 = performance.now()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const ms = performance.now() - t0
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`) // body never printed
  return { json, ms }
}

async function embedMany(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 25) {
    const batch = texts.slice(i, i + 25)
    const one = async (input: string | string[]) =>
      ((await post('/embeddings', { model: EMBED_MODEL, input })).json?.data ?? []) as {
        embedding: number[]
      }[]
    let data = await one(batch)
    // Fall back to one text per request if the endpoint does not batch.
    if (data.length !== batch.length) {
      data = []
      for (const text of batch) data.push(...(await one(text)))
    }
    if (data.length !== batch.length || data.some((d) => d.embedding?.length !== 768))
      throw new Error('Unexpected embedding response shape (expected 768 dimensions per input).')
    out.push(...data.map((d) => d.embedding))
    process.stdout.write(`  embedded ${Math.min(i + 25, texts.length)}/${texts.length}\r`)
  }
  process.stdout.write('\n')
  return out
}

async function scout(prompt: string) {
  if (neurons >= MAX_NEURONS) throw new Error(`neuron cap ${MAX_NEURONS} reached — stopping`)
  chatCalls++
  const { json, ms } = await post('/chat/completions', {
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
    temperature: 0.2,
    max_tokens: 900,
  })
  const usage = (json?.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number }
  const inTok = usage.prompt_tokens ?? 0
  const outTok = usage.completion_tokens ?? 0
  // If usage is not reported, count a conservative estimate so the cap still holds.
  const billIn = inTok || Math.ceil(prompt.length / 2)
  const billOut = outTok || 900
  neurons += (billIn * SCOUT_IN + billOut * SCOUT_OUT) / 1e6
  const content = (json?.choices as { message?: { content?: unknown } }[] | undefined)?.[0]?.message
    ?.content
  let answer = ''
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    answer = [parsed?.answer, parsed?.nextQuestion].filter(Boolean).join('\n')
  } catch {
    answer = ''
  }
  return { ms: Math.round(ms), inTok, outTok, answer }
}

type Passage = {
  file: string
  title: string
  content: string
  entity: string
  sourceId?: string
  sourceUrl: string
}
function passages(): Passage[] {
  return readdirSync(PASSAGE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((file) =>
      (JSON.parse(readFileSync(join(PASSAGE_DIR, file), 'utf8')) as Passage[]).map((p) => ({
        ...p,
        file,
      })),
    )
}
const cosine = (a: number[], b: number[]) => {
  let d = 0,
    na = 0,
    nb = 0
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return d / Math.sqrt(na * nb)
}

// The five genuine complaints from the PR #8 production smoke test.
const COMPLAINTS: [string, string, 'ar' | 'en'][] = [
  [
    'شركة المياه الوطنية',
    'فاتورة الموية عندي ارتفعت بشكل مو طبيعي وكلمتهم أكثر من مرة وما استفدت وين أشتكي؟',
    'ar',
  ],
  ['السعودية للطاقة', 'الكهرباء طافية عندنا من الصبح في الحي وش أسوي؟', 'ar'],
  [
    'هيئة الاتصالات والفضاء والتقنية',
    'شركة الاتصالات تسحب من رصيدي مبالغ ما اشتركت فيها وشكيت لهم وما ردوا',
    'ar',
  ],
  [
    'وزارة التجارة',
    'An online store took my money and never delivered the order, and they ignore me',
    'en',
  ],
  ['وزارة البلديات والإسكان', 'فيه حفريات في الشارع من شهرين ومتروكة بدون إنارة وخطيرة', 'ar'],
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const ps = passages()
  let passageVectors: number[][] | null = null

  if (PHASES.includes('embed') || PHASES.includes('answers') || PHASES.includes('latency')) {
    console.log(`embed: ${ps.length} verified passages`)
    passageVectors = await embedMany(ps.map((p) => `title: ${p.title} | text: ${p.content}`))
  }
  if (PHASES.includes('embed')) {
    const dataset = JSON.parse(readFileSync('evals/dataset.json', 'utf8')) as {
      cases: {
        id: string
        entity: string | null
        language: string
        turns: string[]
        expected: { route: unknown }
      }[]
    }
    const queries = [
      ...questions().map((q) => ({
        id: q.id,
        set: 'knowledge',
        text: q.question,
        authority: q.authority,
        lang: q.lang,
        expect: q.expect,
        kind: q.kind,
      })),
      ...dataset.cases
        .filter((c) => c.turns.length > 0)
        .map((c) => ({
          id: c.id,
          set: 'chat313',
          text: c.turns[0],
          authority: typeof c.expected.route === 'string' ? c.expected.route : null,
          lang: c.language,
        })),
      ...COMPLAINTS.map(([, m, lang], i) => ({
        id: `SMOKE-${i + 1}`,
        set: 'smoke',
        text: m,
        lang,
      })),
    ]
    console.log(`embed: ${queries.length} evaluation queries`)
    const qv = await embedMany(
      queries.map((q) => `task: search result | query: ${sanitizeMessage(q.text)}`),
    )
    writeFileSync(
      join(OUT, 'embeddings.json'),
      JSON.stringify({
        model: EMBED_MODEL,
        dimension: 768,
        createdAt: new Date().toISOString(),
        passages: ps.map((p, i) => ({
          file: p.file,
          title: p.title,
          contentHash: createHash('sha256').update(p.content).digest('hex'),
          embedding: passageVectors![i],
        })),
        queries: queries.map((q, i) => ({ ...q, embedding: qv[i] })),
      }),
    )
    console.log(`embed: wrote .kb-preflight/embeddings.json`)
  }

  const topDocs = (vec: number[]) =>
    ps
      .map((p, i) => ({ p, s: cosine(vec, passageVectors![i]) }))
      .filter((x) => x.s >= 0.4)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(({ p }) => ({
        title: p.title,
        excerpt: p.content.length > 300 ? `${p.content.slice(0, 300)}…` : p.content,
      }))

  if (PHASES.includes('latency')) {
    const embedMs: number[] = []
    const prompts: {
      authority: string
      arm: string
      prompt: string
      factsChars: number
      buildMs: number
    }[] = []
    for (const [authority, message, locale] of COMPLAINTS) {
      const t0 = performance.now()
      const [vec] = await embedMany([`task: search result | query: ${sanitizeMessage(message)}`])
      embedMs.push(Math.round(performance.now() - t0))
      const profile = getAuthorityProfile(authority)!
      for (const arm of ['none', 'verbose', 'compact'] as const) {
        const facts = arm === 'none' ? undefined : profilePromptBlock(profile, message, locale, arm)
        const t1 = performance.now()
        const prompt = buildPrompt({
          sanitizedMessage: sanitizeMessage(message),
          sanitizedHistory: [],
          intent: 'complaint_guidance',
          retrievedDocuments: topDocs(vec),
          locale,
          verifiedAuthority: { nameAr: authority },
          officialFacts: facts,
        })
        prompts.push({
          authority,
          arm,
          prompt,
          factsChars: facts?.length ?? 0,
          buildMs: performance.now() - t1,
        })
      }
    }
    const runs: Record<string, unknown>[] = []
    const arms = ['none', 'verbose', 'compact']
    for (let rep = 0; rep < REPS; rep++) {
      for (const [ci] of COMPLAINTS.entries()) {
        // rotate the arm order so no arm always runs first/last
        const order = arms.map((_, k) => arms[(k + rep + ci) % arms.length])
        for (const arm of order) {
          const p = prompts.find((x) => x.authority === COMPLAINTS[ci][0] && x.arm === arm)!
          const r = await scout(p.prompt)
          runs.push({
            rep,
            complaint: ci + 1,
            arm,
            promptChars: p.prompt.length,
            factsChars: p.factsChars,
            buildMs: Number(p.buildMs.toFixed(3)),
            ms: r.ms,
            inTok: r.inTok,
            outTok: r.outTok,
            answerChars: r.answer.length,
          })
          console.log(
            `latency rep${rep + 1} c${ci + 1} ${arm.padEnd(7)} ${String(r.ms).padStart(6)} ms  in ${r.inTok} out ${r.outTok}  (neurons so far ${Math.round(neurons)})`,
          )
          await sleep(1500)
        }
      }
    }
    writeFileSync(
      join(OUT, 'latency.json'),
      JSON.stringify({ embedMs, runs, model: CHAT_MODEL, at: new Date().toISOString() }, null, 2),
    )
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    for (const arm of arms) {
      const xs = runs.filter((r) => r.arm === arm)
      console.log(
        `  ${arm.padEnd(7)} median ${med(xs.map((r) => r.ms as number))} ms  median in ${med(xs.map((r) => r.inTok as number))} tok  median out ${med(xs.map((r) => r.outTok as number))} tok`,
      )
    }
    console.log(`  query-embedding latency median ${med(embedMs)} ms`)
  }

  if (PHASES.includes('answers')) {
    const pick = questions()
      .filter(
        (q, i) =>
          ['channel', 'procedure', 'time', 'service_level', 'unanswerable'].includes(q.kind) &&
          i % 9 === 0,
      )
      .slice(0, 8)
    const rows: Record<string, unknown>[] = []
    for (const q of pick) {
      const profile = getAuthorityProfile(
        {
          nwc: 'شركة المياه الوطنية',
          sec: 'السعودية للطاقة',
          cst: 'هيئة الاتصالات والفضاء والتقنية',
          mc: 'وزارة التجارة',
          balady: 'وزارة البلديات والإسكان',
        }[q.authority]!,
      )!
      const [vec] = await embedMany([`task: search result | query: ${sanitizeMessage(q.question)}`])
      for (const arm of ['verbose', 'compact'] as const) {
        const facts = profilePromptBlock(profile, q.question, q.lang, arm)
        const r = await scout(
          buildPrompt({
            sanitizedMessage: sanitizeMessage(q.question),
            sanitizedHistory: [],
            retrievedDocuments: topDocs(vec),
            locale: q.lang,
            verifiedAuthority: { nameAr: profile.dbName },
            officialFacts: facts,
          }),
        )
        const scrub = scrubUnverifiedContacts(r.answer, {
          officialUrls: verifiedContacts(profile).urls,
          userText: q.question,
        })
        const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        const numbers = (digits(r.answer).match(/\d{2,}/g) ?? []).filter(
          (n) => !digits(facts + q.question).includes(n),
        )
        const has =
          q.kind === 'unanswerable'
            ? null
            : q.expect.every((e) => digits(r.answer).includes(digits(e)))
        rows.push({
          id: q.id,
          kind: q.kind,
          lang: q.lang,
          arm,
          factPresent: has,
          unverifiedContactsRemoved: scrub.removed.length,
          numbersNotInSources: numbers,
          answer: r.answer,
        })
        console.log(
          `answers ${q.id} ${q.kind.padEnd(13)} ${arm.padEnd(7)} fact=${has ?? 'n/a'} unverified=${scrub.removed.length} newNumbers=${numbers.length}`,
        )
        await sleep(1500)
      }
    }
    writeFileSync(join(OUT, 'answers.json'), JSON.stringify(rows, null, 2))
  }
  console.log(
    `done: ${chatCalls} Scout calls, ~${Math.round(neurons)} neurons (from reported usage; embeddings extra and small)`,
  )
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'preflight failed')
  process.exit(1)
})
