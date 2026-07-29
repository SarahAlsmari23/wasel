import { buildComplaintSummary } from '@/lib/complaints/summary'
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
- **انقطاع كهرباء أو اعتراض على فاتورة كهرباء** → السعودية للطاقة.
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

  // Short and conversational by design (Phase 6.9, Part 5) — the entity's
  // full description, plus any required-documents/submission-steps detail,
  // belongs only to AuthorityModal (triggered via suggestedEntityName below),
  // never duplicated here as chat-bubble prose. Keeps this reply safe to
  // treat as a genuine conversational turn if it's ever restored later.
  const answer = `بحسب وصفك، الجهة المختصة بهذه المشكلة هي **${entity.name}**، ضمن تصنيف **${category}**.

يمكنك مطالعة التفاصيل في نافذة الجهة المختصة، أو البدء في **إنشاء بلاغ** متى أردت.`

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
  const city = answers.city?.trim() ?? ''
  const attempts = answers.attempts?.trim() ?? ''

  // Built from the complete set of collected answers (problem description,
  // city, prior contact) via the same deterministic, structured summary
  // builder the real database-backed flow uses — never just the last
  // answer alone (Phase 6.7, Part 5).
  const { summaryText } = buildComplaintSummary({
    entityName: entity.name,
    complaintTypeLabel: category,
    collectedFields: {
      problem_description: details,
      city,
      prior_provider_contact: attempts,
    },
  })

  return {
    entityId: entity.id,
    entityName: entity.name,
    entityIconKey: entity.iconKey,
    entityDescription: entity.description,
    officialUrl: entity.officialUrl,
    category,
    summary: summaryText || 'بلاغ بحاجة إلى مراجعة الجهة المختصة.',
    details: summaryText,
    // Never mock content in the real, user-facing card — no database-backed
    // source for these exists yet (same as the real path's
    // buildAnalysisFromRouting in wasal-chat.tsx).
    requiredDocuments: [],
    submissionSteps: [],
    confidence: confidence.level,
    confidenceScore: confidence.score,
  }
}
