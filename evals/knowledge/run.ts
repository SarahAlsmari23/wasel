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
import {
  allProfiles,
  getProfileSource,
  profilePromptBlock,
  type AuthorityProfile,
} from '@/lib/government/profiles'
import { getEntityNameForSector } from '@/lib/ai/entity-detection'

type Q = {
  id: string
  authority: string
  lang: 'ar' | 'en'
  kind:
    | 'channel'
    | 'procedure'
    | 'time'
    | 'fee'
    | 'document'
    | 'service_level'
    | 'responsibility'
    | 'unanswerable'
  question: string
  expect: string[]
  sourceUrl: string | null
  split: string
}

const TOPIC: Record<string, { ar: string; en: string; arDialect: string }> = {
  nwc: { ar: 'خدمة المياه', en: 'my water service', arDialect: 'الموية' },
  sec: { ar: 'الكهرباء', en: 'my electricity', arDialect: 'الكهربا' },
  cst: { ar: 'شركة الاتصالات', en: 'my telecom provider', arDialect: 'النت' },
  mc: { ar: 'متجر إلكتروني', en: 'an online store', arDialect: 'المتجر' },
  balady: { ar: 'البلدية', en: 'the municipality', arDialect: 'البلدية' },
}

function questions(): Q[] {
  const out: Q[] = []
  const push = (p: AuthorityProfile, q: Omit<Q, 'id' | 'authority' | 'split'>) =>
    out.push({ id: '', authority: p.code, split: '', ...q })
  for (const p of allProfiles()) {
    const name = p.dbName
    const en = p.officialNameEn?.value ?? name
    const t = TOPIC[p.code]
    for (const c of p.channels) {
      const src = getProfileSource(c.source)?.url ?? null
      if (c.kind === 'phone') {
        push(p, {
          lang: 'ar',
          kind: 'channel',
          question: `ما رقم ${c.label.ar.replace(/\s*\(.*\)/, '')} لدى ${name}؟`,
          expect: [c.value],
          sourceUrl: src,
        })
        push(p, {
          lang: 'ar',
          kind: 'channel',
          question: `وش رقم ${t.arDialect} اللي أتصل عليه لو عندي شكوى؟`,
          expect: [c.value],
          sourceUrl: src,
        })
        push(p, {
          lang: 'en',
          kind: 'channel',
          question: `What number do I call for ${c.label.en.replace(/\s*\(.*\)/, '').toLowerCase()} at ${en}?`,
          expect: [c.value],
          sourceUrl: src,
        })
      } else if (c.kind === 'url') {
        push(p, {
          lang: 'ar',
          kind: 'channel',
          question: `ما رابط ${c.label.ar} لدى ${name}؟`,
          expect: [c.value],
          sourceUrl: src,
        })
        push(p, {
          lang: 'en',
          kind: 'channel',
          question: `Where is the online link to ${c.label.en.toLowerCase()} with ${en}?`,
          expect: [c.value],
          sourceUrl: src,
        })
      } else if (c.kind === 'email') {
        push(p, {
          lang: 'ar',
          kind: 'channel',
          question: `ما البريد الإلكتروني للتواصل مع ${name} بخصوص الشكاوى؟`,
          expect: [c.value],
          sourceUrl: src,
        })
      } else {
        push(p, {
          lang: 'ar',
          kind: 'channel',
          question: `هل لدى ${name} ${c.label.ar} لتقديم الشكاوى؟`,
          expect: [c.value],
          sourceUrl: src,
        })
      }
    }
    for (const proc of p.procedures) {
      const src = getProfileSource(proc.source)?.url ?? null
      push(p, {
        lang: 'ar',
        kind: 'procedure',
        question: `كيف أقدم ${proc.title.ar} لدى ${name}؟`,
        expect: [proc.steps.ar[0]],
        sourceUrl: src,
      })
      push(p, {
        lang: 'ar',
        kind: 'procedure',
        question: `وش خطوات ${proc.title.ar} عند ${name}؟`,
        expect: [proc.steps.ar[proc.steps.ar.length - 1]],
        sourceUrl: src,
      })
      push(p, {
        lang: 'en',
        kind: 'procedure',
        question: `How do I do this with ${en}: ${proc.title.en.toLowerCase()}?`,
        expect: [proc.steps.en[0]],
        sourceUrl: src,
      })
      if (proc.serviceTime) {
        push(p, {
          lang: 'ar',
          kind: 'time',
          question: `كم المدة المنشورة لـ${proc.title.ar} لدى ${name}؟`,
          expect: [proc.serviceTime.ar],
          sourceUrl: src,
        })
        push(p, {
          lang: 'en',
          kind: 'time',
          question: `How long does ${en} take for this: ${proc.title.en.toLowerCase()}?`,
          expect: [proc.serviceTime.en],
          sourceUrl: src,
        })
      }
      if (proc.fee)
        push(p, {
          lang: 'ar',
          kind: 'fee',
          question: `هل ${proc.title.ar} لدى ${name} برسوم؟`,
          expect: [proc.fee.ar],
          sourceUrl: src,
        })
      for (const d of proc.documents?.ar ?? [])
        push(p, {
          lang: 'ar',
          kind: 'document',
          question: `ما المستندات المطلوبة لـ${proc.title.ar} لدى ${name}؟`,
          expect: [d],
          sourceUrl: src,
        })
      for (const x of [...(proc.prerequisites?.ar ?? []), ...(proc.conditions?.ar ?? [])].slice(
        0,
        2,
      )) {
        push(p, {
          lang: 'ar',
          kind: 'procedure',
          question: `ما الشروط قبل ${proc.title.ar} لدى ${name}؟`,
          expect: [x],
          sourceUrl: src,
        })
      }
    }
    for (const sl of p.serviceLevels ?? []) {
      const src = getProfileSource(sl.source)?.url ?? null
      push(p, {
        lang: 'ar',
        kind: 'service_level',
        question: `كم مدة ${sl.item.ar} لدى ${name} في حال انقطاع الكهرباء وما التعويض؟`,
        expect: [sl.value.ar, sl.compensation.ar],
        sourceUrl: src,
      })
      push(p, {
        lang: 'en',
        kind: 'service_level',
        question: `What does ${en} publish for this electricity outage case: ${sl.item.en.toLowerCase()}?`,
        expect: [sl.value.en],
        sourceUrl: src,
      })
    }
    if (p.scope) {
      push(p, {
        lang: 'ar',
        kind: 'responsibility',
        question: `ما اختصاص ${name}؟`,
        expect: [p.website],
        sourceUrl: getProfileSource(p.scope.source)?.url ?? null,
      })
    }
    for (const np of p.notPublished) {
      push(p, {
        lang: 'en',
        kind: 'unanswerable',
        question: `What is the ${np} for complaints at ${en}?`,
        expect: [np],
        sourceUrl: null,
      })
      push(p, {
        lang: 'ar',
        kind: 'unanswerable',
        question: `أبي أعرف ${np} لشكوى ${t.arDialect} لدى ${name}`,
        expect: [np],
        sourceUrl: null,
      })
    }
  }
  // Topic-only questions: no authority named, so routing must come from the intent layer.
  const topical: [string, 'ar' | 'en', Q['kind'], string, string[]][] = [
    ['nwc', 'ar', 'channel', 'الموية مقطوعة عندنا وين أبلغ ورقمهم كم؟', ['931']],
    [
      'nwc',
      'ar',
      'channel',
      'فيه طفح مجاري قدام البيت وين أرفع بلاغ؟',
      ['https://ebranch.nwc.com.sa/water-incidents/submit-incident'],
    ],
    [
      'nwc',
      'en',
      'channel',
      'There is no water at my house, what number do I call to report it?',
      ['931'],
    ],
    ['sec', 'ar', 'channel', 'الكهربا طافية من الصبح وش أسوي؟', ['933']],
    [
      'sec',
      'ar',
      'service_level',
      'الكهرباء مقطوعة من الصبح كم ساعة لازم ترجع وهل فيه تعويض؟',
      ['خلال 6 ساعات كحد أقصى من وقت الانقطاع'],
    ],
    ['sec', 'en', 'channel', 'My power is out, who do I call?', ['933']],
    [
      'sec',
      'ar',
      'procedure',
      'فاتورة الكهرباء عالية مرة وش أسوي؟',
      ['مراجعة تحليل الاستهلاك الشهري عبر الموقع أو تطبيق السعودية للطاقة'],
    ],
    [
      'cst',
      'ar',
      'procedure',
      'شركة النت ما حلت مشكلتي من أسبوع وش أسوي؟',
      ['التصعيد إلى الهيئة إذا أُغلقت الشكوى دون معالجة أو مرت 5 أيام دون حل'],
    ],
    [
      'cst',
      'en',
      'procedure',
      'My internet provider ignored my complaint, can I escalate it?',
      ['Escalate if the provider closed it unresolved or 5 days passed without resolution'],
    ],
    ['mc', 'ar', 'channel', 'متجر إلكتروني ما رجع فلوسي وين أبلغ؟', ['بلاغ تجاري']],
    ['mc', 'ar', 'channel', 'المحل رفض يرجع المنتج المعيب، رقم التواصل كم؟', ['1900']],
    [
      'mc',
      'en',
      'time',
      'How long does a complaint against an online store take?',
      ['7 working days'],
    ],
    ['balady', 'ar', 'channel', 'فيه حفرة كبيرة في الشارع وين أبلغ؟', ['940']],
    [
      'balady',
      'ar',
      'procedure',
      'الزبالة متكدسة في الحي كيف أرفع بلاغ؟',
      ['تسجيل الدخول بتطبيق بلدي أو بوابة بلدي'],
    ],
    ['balady', 'en', 'channel', 'How do I report a pothole on my street?', ['940']],
  ]
  for (const [code, lang, kind, question, expect] of topical) {
    const p = allProfiles().find((x) => x.code === code)!
    out.push({
      id: '',
      authority: p.code,
      split: '',
      lang,
      kind,
      question,
      expect,
      sourceUrl: null,
    })
  }
  out.forEach((q, i) => {
    q.id = `KB-${String(i + 1).padStart(3, '0')}`
    q.split = (i + 1) % 5 === 0 ? 'holdout' : 'dev'
  })
  return out
}

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
