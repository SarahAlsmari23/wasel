import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectSectorByKeyword, mentionsSupportedSector } from '@/lib/ai/entity-detection'
import { isGreetingOnly, isIdentityQuestion } from '@/lib/ai/intent-guards'
import { describesProblem, isInformationQuestion } from '@/lib/ai/problem-signal'
import { buildFormalComplaintLetter } from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'

// Regressions found by the evaluation dataset (evals/). Each case names the
// dataset id that exposed it.

describe('keyword routing (evals)', () => {
  const cases: [string, string, string | null][] = [
    ['SEC-034', 'أبي أرفع شكوى لوزارة التجارة إن الكهرباء مقطوعة عن بيتي', 'electricity'],
    ['SEC-035', 'هل أقدّم شكوى انقطاع الكهرباء إلى هيئة الاتصالات؟', 'electricity'],
    ['BALADY-034', 'أبي أشتكي لشركة الكهرباء إن الزبالة ما انشالت', 'municipality'],
    ['BALADY-036', 'Is the water company in charge of fixing potholes?', 'municipality'],
    ['SEC-036', 'Should I complain to the municipality about my electricity bill?', 'electricity'],
    ['NWC-032', 'لا لحظة، المشكلة في فاتورة الكهربا مو الموية', 'electricity'],
    ['SEC-032', 'لا آسف قصدي الموية مو الكهربا', 'water'],
    ['CST-032', 'لا لحظة، المشكلة إن المتجر ما رجع لي فلوس الجوال', 'commerce'],
    ['X-082', 'ما النتيجة المتوقعة إذا قدمت شكوى على البلدية بسبب الحفر؟', 'municipality'],
    ['X-083', 'أنا مستأجر والمالك قطع عني الكهرباء', 'electricity'],
    ['X-084', 'تغطية التأمين الطبي لا تشمل علاجي.', null],
    ['X-085', 'I want to store my documents safely, any tips?', null],
    ['X-087', 'انتهت النتائج الدراسية ولم تُرفع درجاتي.', null],
    ['MC-009', 'تعرضت لعملية احتيال عبر الإنترنت.', null],
    ['X-091', 'عندي ثلاث مشاكل: النت، الكهربا، والموية', null],
  ]
  for (const [id, message, expected] of cases) {
    it(`${id}: ${message} → ${expected}`, () =>
      assert.equal(detectSectorByKeyword(message), expected))
  }
  it('an ambiguous (two-sector) message still counts as mentioning a sector', () => {
    assert.equal(mentionsSupportedSector('عندي ثلاث مشاكل: النت، الكهربا، والموية'), true)
  })
})

describe('problem vs information question (evals)', () => {
  const problems = [
    'فاتورة الكهرباء لهذا الشهر أعلى بكثير من المعتاد رغم أن استهلاكنا لم يتغير.',
    'يا ولدي المجاري راجعة في الحمام وريحتها مو طبيعية',
    'الرصيف المجاور للمدرسة متهالك ويشكل خطراً على الطلاب.',
    'The store charged me twice and won’t fix it.',
    "We've had no running water for two days. Who do I contact?",
  ]
  for (const m of problems) it(`problem: ${m}`, () => assert.equal(describesProblem(m), true))
  const questions = [
    'ما الجهة المختصة بشكاوى انقطاع المياه؟',
    'ما رقم بلاغات وزارة التجارة؟',
    'How many days does the National Water Company take to resolve a billing complaint?',
    'Which authority handles consumer protection complaints?',
  ]
  for (const m of questions) {
    it(`question: ${m}`, () => {
      assert.equal(isInformationQuestion(m), true)
      assert.equal(describesProblem(m), false)
    })
  }
})

describe('greeting and identity guards (evals)', () => {
  it('English greetings', () => {
    for (const m of ['Hi', 'hello', 'Hey there', 'Good morning!'])
      assert.equal(isGreetingOnly(m), true, m)
    assert.equal(isGreetingOnly('Hi, my water is cut off'), false)
  })
  it('identity questions', () => {
    for (const m of ['What can you do?', 'Are you a bot?', 'هل أنت موظف حكومي؟'])
      assert.equal(isIdentityQuestion(m), true, m)
  })
})

describe('complaint letters keep facts and invent none (evals)', () => {
  it('Arabic letter quotes the user’s amounts and dates (MC-040)', () => {
    const { complaintText } = buildFormalComplaintLetter({
      entityName: 'وزارة التجارة',
      fullName: 'هند فيصل',
      collectedFields: {
        problem_description:
          'لم يصلني طلب بقيمة 450 ريالاً من متجر إلكتروني منذ 20 فبراير 2026 ورفض المتجر الاسترداد',
        merchant_name: 'متجر الأمل',
      },
    })
    assert.match(complaintText, /450/)
    assert.match(complaintText, /20 فبراير 2026/)
    assert.doesNotMatch(complaintText, /ضرر مادي|دون وجه حق|حدثت هذه المشكلة،/)
  })
  it('a meter/bill dispute never asks to restore the power (SEC-042)', () => {
    const { complaintText } = buildFormalComplaintLetter({
      entityName: 'السعودية للطاقة',
      fullName: 'محمد علي',
      collectedFields: {
        problem_description: 'العداد يعطي قراءات غلط والفاتورة طلعت 900 ريال',
        city: 'الدمام',
      },
    })
    assert.doesNotMatch(complaintText, /إعادة التيار|تعذر الاستفادة من التيار/)
    assert.match(complaintText, /مراجعة الفاتورة/)
    assert.match(complaintText, /900/)
  })
  it('slowness is not titled as weak coverage, and prior-contact detail is kept (CST-040)', () => {
    const { subject, complaintText } = buildFormalComplaintLetter({
      entityName: 'هيئة الاتصالات والفضاء والتقنية',
      fullName: 'ريم عبدالله',
      collectedFields: {
        problem_description: 'بطء شديد في الإنترنت المنزلي منذ 1 فبراير 2026',
        city: 'الخبر',
        service_provider: 'مزود الألياف',
        prior_provider_contact: 'نعم، بلاغان دون حل',
      },
    })
    assert.match(subject, /بطء/)
    assert.match(complaintText, /سبق التواصل .*\(بلاغان دون حل\)/)
  })
  it('English letter keeps the prior-contact date (CST-041)', () => {
    const { complaintText } = buildEnglishFormalComplaintLetter({
      entityName: 'هيئة الاتصالات والفضاء والتقنية',
      fullName: 'Omar Farouk',
      collectedFields: {
        problem_description: 'Mobile data charged 150 SAR for a bundle I never activated',
        service_provider: 'My mobile operator',
        prior_provider_contact: 'Yes, called customer care on 4 March',
      },
    })
    assert.match(complaintText, /4 March/)
  })
})

describe('chat prompt carries the verified authority and scope rules (evals)', async () => {
  const { buildPrompt } = await import('@/lib/ai/prompts')
  it('names the verified authority exactly, in both languages (X-053, SEC-026)', () => {
    const prompt = buildPrompt({
      sanitizedMessage: 'الكهرباء مقطوعة',
      sanitizedHistory: [],
      verifiedAuthority: { nameAr: 'السعودية للطاقة', nameEn: 'Saudi Energy (SE)' },
    })
    assert.match(
      prompt,
      /الجهة المختصة المحددة من البيانات الرسمية المعتمدة: السعودية للطاقة \(Saudi Energy \(SE\)\)/,
    )
  })
  it('omits the authority line when routing is not confident', () => {
    const prompt = buildPrompt({ sanitizedMessage: 'أبي أشتكي', sanitizedHistory: [] })
    assert.doesNotMatch(prompt, /الجهة المختصة المحددة من البيانات الرسمية/)
  })
  it('states the five supported authorities and the out-of-scope, ambiguity and no-promise rules', () => {
    const prompt = buildPrompt({ sanitizedMessage: 'x', sanitizedHistory: [] })
    for (const fragment of [
      'الجهات المدعومة حالياً في واصل خمس فقط',
      'خارج نطاق الجهات المدعومة',
      'فاذكر الاحتمالين',
      'لا تعد المستخدم أبداً بنتيجة',
      'لا تساعد في اختلاق',
    ]) {
      assert.ok(prompt.includes(fragment), fragment)
    }
  })
})

describe('letter subject matches the body (evals)', () => {
  it('a water outage despite paid bills is titled as an outage', () => {
    const { subject, complaintText } = buildFormalComplaintLetter({
      entityName: 'الشركة الوطنية للمياه',
      fullName: 'نورة سعد',
      collectedFields: {
        problem_description: 'انقطاع المياه عن المنزل منذ 12 يناير 2026 رغم سداد الفواتير',
        city: 'جدة',
      },
    })
    assert.equal(subject, 'شكوى بشأن انقطاع خدمة المياه')
    assert.match(complaintText, /بشأن انقطاع خدمة المياه/)
  })
  it('a meter fault with a bill is titled as a meter complaint, like its body', () => {
    const { subject, complaintText } = buildFormalComplaintLetter({
      entityName: 'السعودية للطاقة',
      fullName: 'محمد علي',
      collectedFields: {
        problem_description: 'العداد يعطي قراءات غلط والفاتورة طلعت 900 ريال',
        city: 'الدمام',
      },
    })
    assert.equal(subject, 'شكوى بشأن عداد الكهرباء')
    assert.match(complaintText, /خلل في عداد الكهرباء/)
  })
})
