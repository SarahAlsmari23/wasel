'use client'

import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ComplaintProgressStage, ProgressStageState } from '@/types/wasal'

const STAGES: { key: ComplaintProgressStage; label: string; note?: string }[] = [
  { key: 'analysis', label: 'تحليل الشكوى' },
  { key: 'entity', label: 'تحديد الجهة المختصة' },
  { key: 'summary', label: 'إنشاء ملخص البلاغ' },
  { key: 'ready', label: 'جاهز للتقديم' },
  { key: 'submitted', label: 'تم التقديم', note: 'ميزة قادمة' },
]

const DOT_CLASSES: Record<ProgressStageState, string> = {
  done: 'bg-status-completed text-white',
  current: 'bg-status-pending text-white',
  upcoming: 'bg-primary/10 text-muted-foreground',
}

type ProgressTimelineProps = {
  /** Everything before this stage renders as done; this one is "current". */
  currentStage: ComplaintProgressStage
  className?: string
}

/**
 * Shows the user where they are in the complaint journey after analysis
 * completes (Phase 2 "Complaint Progress Timeline").
 */
export function ProgressTimeline({ currentStage, className = '' }: ProgressTimelineProps) {
  const currentIndex = STAGES.findIndex((stage) => stage.key === currentStage)

  return (
    <div className={cn('bg-surface border-border shadow-soft rounded-2xl border p-5', className)}>
      <p className="text-foreground mb-4 text-sm font-semibold">مسار البلاغ</p>

      <ol className="flex flex-col">
        {STAGES.map((stage, index) => {
          const state: ProgressStageState =
            index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
          const isLast = index === STAGES.length - 1

          return (
            <motion.li
              key={stage.key}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.07 }}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
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

              <div className={cn('flex flex-col', isLast ? 'pb-0' : 'pb-5')}>
                <span
                  className={cn(
                    'text-sm',
                    state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground font-medium',
                  )}
                >
                  {stage.label}
                </span>
                {stage.note ? (
                  <span className="text-muted-foreground text-[11px]">{stage.note}</span>
                ) : null}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
