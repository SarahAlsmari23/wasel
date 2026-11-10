import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSources, groundFacts } from '@/lib/complaints/drafting/facts'
import { validateDraft } from '@/lib/complaints/drafting/validate'
import {
  cleanModelBody,
  draftComplaintLetter,
  isAiDraftingEnabled,
  type DraftInput,
} from '@/lib/complaints/drafting/pipeline'
import { buildFormalComplaintLetter } from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'
import { extractAmounts, extractDates } from '@/lib/complaints/drafting/text'

const WATER = 'الشركة الوطنية للمياه'
const WATER_BILL =
  'فاتورة الموية عندي ارتفعت بشكل مو طبيعي وكلمتهم أكثر من مرة وما استفدت وين أشتكي؟'

type Call = { system: string; user: string; schema: { name: string } }

/** A scripted Llama: returns the queued JSON per call, records the prompts. */
function scripted(responses: (unknown | Error)[]) {
  const calls: Call[] = []
  const fn = async (input: Call & Record<string, unknown>) => {
    calls.push(input)
    const next = responses.shift()
    if (next instanceof Error) throw next
    if (next === undefined) throw new Error('no scripted response')
    return {
      json: next,
      model: '@cf/meta/llama-4-scout-17b-16e-instruct',
      usage: { promptTokens: 1000, completionTokens: 300 },
      ms: 5,
    }
  }
  return { fn: fn as never, calls }
}

const waterExtraction = {
  problem: {
    text: 'ارتفاع غير معتاد في فاتورة المياه',
    quote: 'فاتورة الموية عندي ارتفعت بشكل مو طبيعي',
    source: 1,
  },
  events: [],
  contact: {
    status: 'yes',
    attempts: '3',
    quote: 'كلمتهم أكثر من مرة وما استفدت',
    source: 1,
    response: { text: '', quote: '', source: 0 },
  },
  resolution: { text: '', quote: '', source: 0 },
  evidence: [],
  locations: [{ text: 'الرياض', quote: 'الرياض', source: 2 }],
  corrections: [],
  uncertain: [],
}
const goodWaterDraft = {
  subject: 'شكوى بشأن ارتفاع قيمة فاتورة المياه',
  body: 'أتقدم إليكم بهذه الشكوى بشأن ارتفاع غير معتاد لاحظته في قيمة فاتورة المياه الخاصة بمنزلي في مدينة الرياض.\n\nوقد سبق لي التواصل مع الشركة أكثر من مرة لمحاولة معالجة المشكلة، إلا أنها لم تُحل حتى الآن.\n\nلذا أرجو مراجعة الفاتورة والتحقق من صحة المبلغ المحتسب، واتخاذ الإجراء المناسب في حال وجود خطأ.',
}
const waterInput: DraftInput = {
  locale: 'ar',
  entityName: WATER,
  fullName: 'سارة أحمد',
  collectedFields: { problem_description: WATER_BILL, city: 'الرياض' },
  userMessages: [WATER_BILL, 'الرياض'],
}

describe('fact grounding', () => {
  const sources = buildSources(['فاتورتي صارت 900 ريال وكانت 150', 'كلمتهم أكثر من مرة'], {}, {})
  it('keeps exact amounts deterministically, including "وكانت 150"', () => {
    const facts = groundFacts({}, sources, 'electricity')
    assert.deepEqual(facts.amounts.map((a) => a.value).sort(), ['150', '900'])
  })
  it('drops a model fact whose quote the user never wrote', () => {
    const facts = groundFacts(
      {
        problem: { text: 'عداد معطل', quote: 'العداد خربان', source: 1 },
        events: [],
        contact: {},
        corrections: [],
      },
      sources,
      'electricity',
    )
    assert.equal(facts.problem, null)
    assert.equal(facts.rejected, 1)
  })
  it('never turns "أكثر من مرة" into a number', () => {
    const facts = groundFacts(
      { contact: { status: 'yes', attempts: 3, quote: 'كلمتهم أكثر من مرة', source: 2 } },
      sources,
      'electricity',
    )
    assert.equal(facts.priorContact.status, 'yes')
    assert.equal(facts.priorContact.attempts, 'multiple')
  })
  it('a correction supersedes the original amount', () => {
    const s = buildSources(['الفاتورة 900 ريال', 'لا قصدي 950 ريال'], {}, {})
    const facts = groundFacts(
      { corrections: [{ original: 'الفاتورة 900 ريال', corrected: 'قصدي 950 ريال', source: 2 }] },
      s,
      'water',
    )
    assert.equal(facts.amounts.find((a) => a.value === '900')?.superseded, true)
    assert.equal(facts.amounts.find((a) => a.value === '950')?.superseded, false)
  })
  it('extracts explicit dates and Arabic-Indic amounts', () => {
    assert.deepEqual(extractDates('من 3 مارس 2026'), ['3 مارس 2026'])
    assert.equal(extractAmounts('دفعت ٤٥٠ ريال')[0].value, '450')
  })
})

describe('independent letter validation', () => {
  const sources = buildSources([WATER_BILL], { city: 'الرياض' }, {})
  const facts = groundFacts(waterExtraction, sources, 'water')
  const ctx = {
    userCorpus: sources.map((s) => s.text).join('\n'),
    facts,
    authorityNames: [WATER, 'National Water Company'],
    allowedNames: [],
    locale: 'ar' as const,
  }
  const codes = (body: string, subject = 'شكوى بشأن فاتورة المياه') =>
    validateDraft({ subject, body: `${goodWaterDraft.body}\n\n${body}` }, ctx).issues.map(
      (i) => i.code,
    )

  it('accepts a faithful, formal draft', () => {
    const result = validateDraft(goodWaterDraft, ctx)
    assert.ok(result.ok, JSON.stringify(result.issues))
  })
  it('rejects invented numbers and counts', () => {
    assert.ok(codes('وقد بلغت قيمة الفاتورة 1200 ريال.').includes('fabricated-number'))
    assert.ok(codes('وتواصلت معهم ثلاث مرات.').includes('fabricated-count'))
  })
  it('rejects unsupported damage, legal, evidence, defect and accusation claims', () => {
    assert.ok(codes('وقد تسبب ذلك في أضرار مالية كبيرة.').includes('unsupported-damage-claim'))
    assert.ok(codes('وهذا يعد مخالفة صريحة للنظام.').includes('unsupported-legal-claim'))
    assert.ok(codes('وأرفقت صور الفاتورة.').includes('unsupported-evidence-claim'))
    assert.ok(codes('ويبدو أن العداد معطل.').includes('unsupported-defect-claim'))
    assert.ok(codes('وأعتقد أن هناك تلاعباً متعمداً.').includes('unsupported-accusation'))
  })
  it('rejects other or outdated authority names, contact details and questions', () => {
    assert.ok(codes('وقد راجعت الشركة السعودية للطاقة.').includes('unverified-authority-name'))
    assert.ok(codes('ويمكن التواصل على 920001234.').includes('fabricated-number'))
    assert.ok(codes('للمزيد: https://example.com').includes('fabricated-contact-info'))
    assert.ok(codes('فهل يمكن مساعدتي؟').includes('question-in-letter'))
  })
  it('rejects dialect and the user’s informal sentence pasted in', () => {
    assert.ok(codes('وكلمتهم وما استفدت.').includes('dialect'))
    assert.ok(codes(`«${WATER_BILL}»`).includes('copied-informal-text'))
  })
  it('requires every amount and rejects a corrected (superseded) value', () => {
    const s = buildSources(['الفاتورة 900 ريال', 'لا قصدي 950 ريال'], {}, {})
    const f = groundFacts(
      { corrections: [{ original: 'الفاتورة 900 ريال', corrected: 'قصدي 950 ريال', source: 2 }] },
      s,
      'water',
    )
    const c = { ...ctx, userCorpus: s.map((x) => x.text).join('\n'), facts: f }
    const body =
      'أتقدم بهذه الشكوى بشأن قيمة فاتورة المياه التي بلغت 900 ريال، وأرجو مراجعتها والتحقق من صحة المبلغ المحتسب واتخاذ الإجراء المناسب في حال وجود خطأ.'
    const result = validateDraft({ subject: 'اعتراض على فاتورة مياه', body }, c).issues.map(
      (i) => i.code,
    )
    assert.ok(result.includes('superseded-value'))
    assert.ok(result.includes('missing-amount'))
  })
})

describe('drafting pipeline (mocked Llama)', () => {
  it('uses the validated Llama draft and frames it server-side', async () => {
    const llm = scripted([waterExtraction, goodWaterDraft])
    const result = await draftComplaintLetter(waterInput, llm.fn)
    assert.equal(result.meta.path, 'ai')
    assert.equal(result.meta.calls, 2)
    assert.match(result.letter.complaintText, /^إلى: الشركة الوطنية للمياه/)
    assert.match(result.letter.complaintText, /الاسم: سارة أحمد$/)
    assert.ok(!result.letter.complaintText.includes('وين أشتكي'))
    assert.ok(result.meta.neurons > 0)
  })
  it('never sends the user’s name to the model, and sends user text only as data', async () => {
    const llm = scripted([waterExtraction, goodWaterDraft])
    await draftComplaintLetter(waterInput, llm.fn)
    for (const call of llm.calls) assert.ok(!`${call.system}${call.user}`.includes('سارة أحمد'))
    assert.match(llm.calls[0].user, /<<<[\s\S]*>>>/)
  })
  it('corrects a rejected draft once, then accepts it', async () => {
    const bad = {
      ...goodWaterDraft,
      body: `${goodWaterDraft.body}\n\nوقد تسبب ذلك في أضرار مالية.`,
    }
    const llm = scripted([waterExtraction, bad, goodWaterDraft])
    const result = await draftComplaintLetter(waterInput, llm.fn)
    assert.equal(result.meta.path, 'ai_corrected')
    assert.deepEqual(result.meta.rejectedIssues, ['unsupported-damage-claim'])
    assert.match(llm.calls[2].user, /unsupported claim/)
  })
  it('falls back to the deterministic letter when the draft stays invalid', async () => {
    const bad = { ...goodWaterDraft, body: `${goodWaterDraft.body} وتبلغ الفاتورة 999 ريال.` }
    const result = await draftComplaintLetter(waterInput, scripted([waterExtraction, bad, bad]).fn)
    assert.equal(result.meta.path, 'fallback')
    assert.equal(result.meta.fallbackReason, 'validation_failed')
    assert.ok(!result.letter.complaintText.includes('999'))
  })
  it('falls back when the provider fails (extraction or drafting)', async () => {
    const a = await draftComplaintLetter(waterInput, scripted([new Error('HTTP 503')]).fn)
    assert.equal(a.meta.fallbackReason, 'extraction_failed')
    const b = await draftComplaintLetter(
      waterInput,
      scripted([waterExtraction, new Error('timeout')]).fn,
    )
    assert.equal(b.meta.fallbackReason, 'draft_failed')
    for (const r of [a, b]) {
      assert.match(r.letter.complaintText, /^إلى: الشركة الوطنية للمياه/)
      assert.ok(!r.letter.complaintText.includes('وين أشتكي'))
    }
  })
  it('reuses stored facts on regeneration when the case is unchanged', async () => {
    const first = await draftComplaintLetter(
      waterInput,
      scripted([waterExtraction, goodWaterDraft]).fn,
    )
    const llm = scripted([goodWaterDraft])
    const again = await draftComplaintLetter(
      { ...waterInput, style: 'shorter', previousFacts: first.facts },
      llm.fn,
    )
    assert.equal(again.meta.factsReused, true)
    assert.equal(llm.calls.length, 1)
    assert.match(llm.calls[0].system, /مختصرة جداً/)
  })
  it('re-extracts when the facts changed (edited description)', async () => {
    const first = await draftComplaintLetter(
      waterInput,
      scripted([waterExtraction, goodWaterDraft]).fn,
    )
    const llm = scripted([new Error('stop after extraction')])
    const edited = await draftComplaintLetter(
      {
        ...waterInput,
        collectedFields: { problem_description: 'الفاتورة 950 ريال', city: 'الرياض' },
        userMessages: [],
        previousFacts: first.facts,
      },
      llm.fn,
    )
    assert.equal(edited.meta.factsReused, false)
    assert.equal(llm.calls.length, 1)
    assert.match(edited.letter.complaintText, /950/)
  })
  it('strips a frame the model adds anyway', () => {
    assert.equal(
      cleanModelBody('السلام عليكم ورحمة الله\nنص الشكوى\n- بند\nوتفضلوا بقبول فائق الاحترام'),
      'نص الشكوى\nبند',
    )
  })
  it('is disabled unless AI_COMPLAINT_DRAFTING=enabled', () => {
    const before = process.env.AI_COMPLAINT_DRAFTING
    delete process.env.AI_COMPLAINT_DRAFTING
    assert.equal(isAiDraftingEnabled(), false)
    process.env.AI_COMPLAINT_DRAFTING = 'enabled'
    assert.equal(isAiDraftingEnabled(), true)
    if (before === undefined) delete process.env.AI_COMPLAINT_DRAFTING
    else process.env.AI_COMPLAINT_DRAFTING = before
  })
})

describe('deterministic fallback letters (no model)', () => {
  it('water-bill case: formal, no pasted colloquial text or question', () => {
    const { complaintText, subject } = buildFormalComplaintLetter(waterInput)
    assert.equal(subject, 'اعتراض على فاتورة مياه')
    assert.match(complaintText, /ارتفاع قيمة فاتورة المياه/)
    assert.match(complaintText, /أكثر من مرة/)
    assert.match(complaintText, /مراجعة الفاتورة والتحقق من صحة المبلغ المحتسب/)
    assert.ok(!/[؟?]/.test(complaintText))
    assert.ok(!complaintText.includes('الموية'))
    assert.ok(!complaintText.includes('وفق الأنظمة'))
  })
  it('keeps every amount and date in formal wording', () => {
    const { complaintText, subject } = buildFormalComplaintLetter({
      entityName: 'السعودية للطاقة',
      fullName: 'سارة',
      collectedFields: {
        problem_description: 'فاتورتي صارت 900 ريال وكانت 150 من 3 مارس',
        city: 'جدة',
      },
    })
    assert.equal(subject, 'اعتراض على فاتورة كهرباء')
    assert.match(complaintText, /900 ريال/)
    assert.match(complaintText, /150/)
    assert.match(complaintText, /3 مارس/)
    assert.ok(!complaintText.includes('صارت'))
  })
  it('English: classified issue, exact facts, no pasted Arabic or slang', () => {
    const { complaintText } = buildEnglishFormalComplaintLetter({
      entityName: WATER,
      fullName: 'Sara',
      collectedFields: { problem_description: WATER_BILL, city: 'Riyadh' },
      userMessages: [WATER_BILL],
    })
    assert.match(complaintText, /regarding the amount of my water bill, at a location in Riyadh/)
    assert.match(complaintText, /several occasions/)
    assert.ok(!/[؀-ۿ]/.test(complaintText.replace(/^To:.*$/m, '')))
  })
})
