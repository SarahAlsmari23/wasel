import { GOVERNMENT_ENTITIES } from '@/lib/mock/government-entities'
import { matchCategory, matchEntity } from '@/lib/wasal/entity-matching'
import type { ComplaintAnalysis, ConfidenceLevel } from '@/types/wasal'

/**
 * Mocked Wasal intelligence for the MVP. Everything here is deterministic and
 * runs in the browser — no model call, no persistence. The Ask-Wasal flow
 * prefers the real /api/ai/chat endpoint and only falls back to
 * `buildAssistantAnswer` when that endpoint is unavailable or errors.
 */

const ASSISTANT_INTRO =
  'أنا **واصل**، مساعدك في البلاغات الحكومية. اسألني عن الجهة المختصة بمشكلتك، أو عن إجراءات ومستندات تقديم أي بلاغ.'

/** Answers for questions that aren't about a specific authority. */
const GENERAL_ANSWERS: { pattern: RegExp; answer: string }[] = [
  {
    pattern: /كيف أعرف الجهة|الجهة المختصة|الجهة المسؤولة|أي جهة|وين أقدم/,
    answer: `تحديد الجهة المختصة يعتمد على **طبيعة المشكلة** وليس على مكانها:

- **مشكلة في الشارع أو النظافة أو المرافق العامة** → وزارة البلديات والإسكان.
- **مشكلة في المياه أو الصرف الصحي أو فاتورة المياه** → الشركة الوطنية للمياه.
- **انقطاع كهرباء أو اعتراض على فاتورة كهرباء** → الشركة السعودية للكهرباء.
- **ضعف تغطية أو خلاف مع مزود اتصالات** → هيئة الاتصالات والفضاء والتقنية.
- **خلاف مع متجر أو مشكلة كمستهلك** → وزارة التجارة.

صف لي مشكلتك بالتفصيل وسأحدد لك الجهة الأنسب.`,
  },
  {
    pattern: /مستندات|أوراق|مرفقات|وثائق|إثبات/,
    answer: `تختلف المستندات باختلاف الجهة، لكن هذه المستندات مطلوبة في أغلب البلاغات:

- **إثبات الواقعة**: صورة أو فيديو أو فاتورة.
- **رقم الحساب أو رقم الطلب** المرتبط بالخدمة.
- **إثبات المراسلات السابقة** مع الجهة أو مزود الخدمة.
- **تحديد الموقع** إذا كانت المشكلة ميدانية.

أخبرني بالجهة التي تقصدها وسأعطيك القائمة الدقيقة لها.`,
  },
  {
    pattern: /كم يستغرق|مدة|متى يتم الرد|كم مدة/,
    answer: `مدة المعالجة تختلف حسب الجهة ونوع البلاغ، وبشكل عام:

- **البلاغات الميدانية** (نظافة، إنارة، حفريات): من يوم إلى عدة أيام عمل.
- **الاعتراضات على الفواتير**: عادة تحتاج دورة مراجعة أطول.
- **الشكاوى ضد مزودي الخدمة**: غالباً يجب تقديمها للمزود أولاً، ثم للجهة المنظمة إن لم تُعالج.

احتفظ دائماً بالرقم المرجعي للبلاغ لمتابعته.`,
  },
  {
    pattern: /مرحبا|السلام|أهلا|هلا|مساء|صباح/,
    answer: `وعليكم السلام، أهلاً بك 👋

${ASSISTANT_INTRO}`,
  },
]

const FALLBACK_ANSWER = `لم أتمكن من تحديد الجهة المختصة من وصفك الحالي.

لمساعدتك بدقة أكبر، وضّح لي:

- **ما المشكلة بالضبط؟**
- **مع أي خدمة أو جهة حدثت؟**
- **متى بدأت؟**

وإذا أردت إعداد بلاغ رسمي جاهز للتقديم، ابدأ **إنشاء بلاغ** وسأجمع معك التفاصيل خطوة بخطوة.`

export type AssistantAnswer = {
  answer: string
  suggestedEntityName?: string
  suggestedEntityReason?: string
}

export function buildAssistantAnswer(message: string): AssistantAnswer {
  const general = GENERAL_ANSWERS.find(({ pattern }) => pattern.test(message))
  if (general) {
    return { answer: general.answer }
  }

  const match = matchEntity(message)
  if (!match) {
    return { answer: FALLBACK_ANSWER }
  }

  const { entity } = match
  const category = matchCategory(entity, message)

  const answer = `بحسب وصفك، الجهة المختصة بهذه المشكلة هي **${entity.name}**.

${entity.description}

**تصنيف الشكوى المرجّح:** ${category}

**المستندات التي يُفضّل تجهيزها:**
${entity.requiredDocuments.map((document) => `- ${document}`).join('\n')}

**خطوات التقديم:**
${entity.submissionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

يمكنك [زيارة الموقع الرسمي](${entity.officialUrl}) لتقديم البلاغ مباشرة، أو أن تبدأ **إنشاء بلاغ** هنا لأصيغه لك باحترافية أولاً.`

  return {
    answer,
    suggestedEntityName: entity.name,
    suggestedEntityReason: `المشكلة التي وصفتها تقع ضمن اختصاص ${entity.name} (${category}).`,
  }
}

/* ------------------------------------------------------------------ */
/* Complaint Builder — a fixed question script                         */
/* ------------------------------------------------------------------ */

export type ComplaintFieldKey = 'subject' | 'details' | 'city' | 'attempts' | 'fullName'

export type ComplaintStep = {
  key: ComplaintFieldKey
  question: string
  /** Shown under the question as example phrasing. */
  hint?: string
}

export const COMPLAINT_STEPS: ComplaintStep[] = [
  {
    key: 'subject',
    question: 'لنبدأ. **ما هي الجهة أو الخدمة التي تواجه المشكلة معها؟**',
    hint: 'مثال: شركة الاتصالات، البلدية، متجر إلكتروني، فاتورة المياه...',
  },
  {
    key: 'details',
    question: '**اشرح لي المشكلة بالتفصيل.** ما الذي حدث بالضبط، ومتى بدأ؟',
    hint: 'كلما زادت التفاصيل، كان البلاغ أدق.',
  },
  {
    key: 'city',
    question: '**في أي مدينة حدثت المشكلة؟**',
    hint: 'مثال: الرياض، جدة، الدمام.',
  },
  {
    key: 'attempts',
    question:
      '**هل تواصلت مع الجهة سابقاً بخصوص هذه المشكلة؟** إن كان لديك رقم مرجعي فاذكره، وإلا اكتب «لا».',
  },
  {
    key: 'fullName',
    question: '**أخيراً، ما اسمك الكامل؟** سيُستخدم لتوقيع البلاغ.',
  },
]

export const COMPLAINT_INTRO =
  'سأساعدك في إعداد بلاغ احترافي جاهز للتقديم. سأطرح عليك بضعة أسئلة قصيرة، ثم أحدد الجهة المختصة وأصيغ لك ملخص البلاغ.'

export type ComplaintAnswers = Partial<Record<ComplaintFieldKey, string>>

const CONFIDENCE_BY_HITS: { minHits: number; level: ConfidenceLevel; score: number }[] = [
  { minHits: 3, level: 'high', score: 94 },
  { minHits: 2, level: 'high', score: 88 },
  { minHits: 1, level: 'medium', score: 76 },
]

/**
 * Turns the collected answers into the recommendation shown on the card.
 * Falls back to the consumer-protection authority with an explicitly low
 * confidence when nothing in the text points at a specific entity.
 */
export function buildComplaintAnalysis(answers: ComplaintAnswers): ComplaintAnalysis {
  const searchText = [answers.subject, answers.details].filter(Boolean).join(' ')
  const match = matchEntity(searchText)
  const entity = match?.entity ?? GOVERNMENT_ENTITIES[GOVERNMENT_ENTITIES.length - 1]
  const category = matchCategory(entity, searchText)

  const confidence = match
    ? (CONFIDENCE_BY_HITS.find(({ minHits }) => match.hits >= minHits) ?? {
        level: 'medium' as ConfidenceLevel,
        score: 70,
      })
    : { level: 'low' as ConfidenceLevel, score: 52 }

  const details = answers.details?.trim() ?? ''
  const city = answers.city?.trim()
  const attempts = answers.attempts?.trim()
  const hasPriorContact = Boolean(attempts) && !/^(لا|لأ|no)$/i.test(attempts ?? '')

  const summary = details.length > 140 ? `${details.slice(0, 137).trimEnd()}...` : details

  const detailLines = [
    details,
    city ? `**المدينة:** ${city}` : null,
    hasPriorContact ? `**تواصل سابق مع الجهة:** ${attempts}` : '**تواصل سابق مع الجهة:** لا يوجد.',
  ].filter(Boolean)

  return {
    entityId: entity.id,
    entityName: entity.name,
    entityIconKey: entity.iconKey,
    entityDescription: entity.description,
    officialUrl: entity.officialUrl,
    category,
    summary: summary || 'بلاغ بحاجة إلى مراجعة الجهة المختصة.',
    details: detailLines.join('\n\n'),
    requiredDocuments: entity.requiredDocuments,
    submissionSteps: entity.submissionSteps,
    confidence: confidence.level,
    confidenceScore: confidence.score,
  }
}

/** The professional complaint letter the user can copy or save. */
export function buildComplaintLetter(
  answers: ComplaintAnswers,
  analysis: ComplaintAnalysis,
): string {
  const fullName = answers.fullName?.trim() || 'مقدّم البلاغ'
  const attempts = answers.attempts?.trim()
  const hasPriorContact = Boolean(attempts) && !/^(لا|لأ|no)$/i.test(attempts ?? '')

  const contextLines = [
    answers.city?.trim() ? `المدينة: ${answers.city.trim()}` : null,
    hasPriorContact ? `تواصل سابق مع الجهة: ${attempts}` : null,
  ].filter(Boolean)

  return `إلى: ${analysis.entityName}
الموضوع: ${analysis.category}

السلام عليكم ورحمة الله وبركاته،

أتقدم أنا الموقع أدناه، ${fullName}، بصفتي أحد المستفيدين من خدمات ${analysis.entityName}، بشكوى بخصوص ${analysis.category}.

تفاصيل المشكلة:
${answers.details?.trim() ?? ''}
${contextLines.length > 0 ? `\n${contextLines.join('\n')}` : ''}

آمل التكرم بالنظر في هذه الشكوى واتخاذ الإجراء اللازم لحل المشكلة في أقرب وقت ممكن.

وتفضلوا بقبول فائق الاحترام والتقدير،
${fullName}`
}

/** Title used for the saved complaint and its conversation. */
export function buildComplaintTitle(analysis: ComplaintAnalysis): string {
  return `${analysis.category} — ${analysis.entityName}`
}
