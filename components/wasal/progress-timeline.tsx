'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'
import type { ComplaintProgressStage, ProgressStageState } from '@/types/wasal'

const COPY = defineCopy({
  ar: {
    title: 'مسار البلاغ',
    stages: {
      analysis: 'تحليل الشكوى',
      entity: 'تحديد الجهة المختصة',
      summary: 'جمع تفاصيل البلاغ',
      ready: 'جاهز للإنشاء',
      submitted: 'تقديمه عبر القناة الرسمية',
    } satisfies Record<ComplaintProgressStage, string>,
  },
  en: {
    title: 'Complaint progress',
    stages: {
      analysis: 'Analyse the complaint',
      entity: 'Identify the authority',
      summary: 'Collect the details',
      ready: 'Ready to create',
      submitted: 'Submit via the official channel',
    } satisfies Record<ComplaintProgressStage, string>,
  },
})

const STAGE_ORDER: ComplaintProgressStage[] = ['analysis', 'entity', 'summary', 'ready', 'submitted']

const DOT_CLASSES: Record<ProgressStageState, string> = {
  done: 'bg-status-completed text-white',
  current: 'bg-status-pending text-white',
  upcoming: 'bg-primary/10 text-muted-foreground',
}

type ProgressTimelineProps = {
  currentStage: ComplaintProgressStage
  className?: string
}

export function ProgressTimeline({ currentStage, className = '' }: ProgressTimelineProps) {
  const copy = useCopy(COPY)
  const prefersReducedMotion = useReducedMotion()
  const currentIndex = STAGE_ORDER.indexOf(currentStage)

  return (
    <div className={cn('bg-surface border-border shadow-soft rounded-2xl border p-5', className)}>
      <p className="text-foreground mb-4 text-sm font-semibold">{copy.title}</p>

      <ol className="flex flex-col">
        {STAGE_ORDER.map((stageKey, index) => {
          const state: ProgressStageState =
            index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
          const isLast = index === STAGE_ORDER.length - 1

          return (
            <motion.li
              key={stageKey}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                    DOT_CLASSES[state],
                  )}
                >
                  {state === 'done' ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  )}
                </span>
                {isLast ? null : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-px flex-1',
                      index < currentIndex ? 'bg-status-completed/40' : 'bg-border',
                    )}
                  />
                )}
              </div>

              <span
                className={cn(
                  'text-sm',
                  isLast ? 'pb-0' : 'pb-5',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground font-medium',
                )}
              >
                {copy.stages[stageKey]}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
