import { FileSignature, MessageSquareText } from 'lucide-react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { cn } from '@/lib/utils/cn'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const STEP_COPY = defineCopy({
  ar: {
    stepLabel: 'الخطوة',
    steps: [
      {
        title: 'صف مشكلتك',
        description: 'ابدأ محادثة طبيعية مع واصل واشرح المشكلة كما لو كنت تتحدث مع شخص يساعدك.',
      },
      {
        title: 'واصل يحلل الحالة',
        description:
          'يقوم واصل بتحليل المشكلة وتحديد الجهة الحكومية المناسبة مع اقتراح أفضل طريقة لمعالجة البلاغ.',
      },
      {
        title: 'أنشئ البلاغ',
        description: 'بعد التأكد من الجهة المناسبة يمكنك تسجيل الدخول وإنشاء البلاغ خلال ثوانٍ.',
      },
    ],
  },
  en: {
    stepLabel: 'Step',
    steps: [
      {
        title: 'Describe your problem',
        description:
          'Start a natural conversation with Wasel and explain the problem as if you were talking to someone helping you.',
      },
      {
        title: 'Wasel analyses it',
        description:
          'Wasel analyses the problem, identifies the right government authority, and suggests the best way to handle your complaint.',
      },
      {
        title: 'Create the complaint',
        description:
          'Once the authority is confirmed, sign in and create your formal complaint in seconds.',
      },
    ],
  },
})

/** Step 02 is Wasel doing the work, so it carries the official logo mark. */
const STEPS = [
  { number: '01', icon: MessageSquareText },
  { number: '02', icon: null },
  { number: '03', icon: FileSignature },
] as const

/**
 * The three steps as one connected sequence — the same dashed journey line
 * as the hero, running from each step's icon to the next. Horizontal from
 * `md` up (following the reading direction), vertical on phones.
 */
export async function HowItWorks() {
  const copy = STEP_COPY[await getLocale()]

  return (
    <ol className="bg-surface/85 border-border grid gap-8 rounded-3xl border p-6 sm:p-8 md:grid-cols-3 md:gap-8 md:p-10">
      {STEPS.map((step, index) => {
        const Icon = step.icon
        const text = copy.steps[index]
        const isLast = index === STEPS.length - 1
        return (
          <li key={step.number} className="relative flex gap-4 md:flex-col md:gap-5">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'border-secondary/30 absolute border-dashed',
                  // phones: down from this icon to the next one
                  'start-[1.375rem] top-14 -bottom-6 border-s',
                  // md+: across from this icon to the next column's icon
                  'md:start-14 md:-end-4 md:top-[1.375rem] md:bottom-auto md:border-s-0 md:border-t',
                )}
              />
            ) : null}

            <span
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                Icon === null
                  ? 'border-primary/25 bg-white'
                  : 'border-border bg-surface text-secondary',
              )}
            >
              {Icon === null ? (
                <WaselLogo size="sm" variant="mark" />
              ) : (
                <Icon className="h-5 w-5" aria-hidden="true" />
              )}
            </span>

            <div className="flex flex-col gap-2">
              <span className="text-primary text-xs font-semibold tabular-nums" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="text-heading text-lg font-semibold">
                <span className="sr-only">
                  {copy.stepLabel} {step.number}:{' '}
                </span>
                {text.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                {text.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
