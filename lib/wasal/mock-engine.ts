import { matchCategory, matchEntity } from '@/lib/wasal/entity-matching'

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

// Phase 8, Part 1/4/16 — the fixed 5-question complaint script and its
// analysis builder (buildComplaintAnalysis) have been removed. The real
// complaint flow never used a fixed step order to begin with (it's always
// driven by complaint_types.required_fields — see
// lib/wasal/conversation-state.ts), and a model/network failure no longer
// needs a separate, hardcoded fallback: app/api/ai/chat/route.ts now
// degrades a generation failure to the same deterministic next question
// directly. `COMPLAINT_INTRO` is kept only because
// lib/wasal/message-classification.ts still uses it to recognize a
// pre-Phase-6.9 sessionStorage entry that predates the `kind` field.
export const COMPLAINT_INTRO =
  'سأساعدك في إعداد بلاغ احترافي جاهز للتقديم. سأطرح عليك بضعة أسئلة قصيرة، ثم أحدد الجهة المختصة وأصيغ لك ملخص البلاغ.'
