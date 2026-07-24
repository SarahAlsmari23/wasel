'use client'

const STEP_LABELS = ['نوع الشكوى', 'تفاصيل المشكلة', 'بيانات التواصل', 'المراجعة']

type ComplaintStepperProps = {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function ComplaintStepper({ currentStep, onStepClick }: ComplaintStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1
        const isCompleted = step < currentStep
        const isCurrent = step === currentStep
        const isClickable = isCompleted && Boolean(onStepClick)

        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step)}
              className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                isCurrent
                  ? 'font-semibold'
                  : isCompleted
                    ? 'text-black/60 dark:text-white/60'
                    : 'text-black/30 dark:text-white/30'
              } ${isClickable ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isCurrent
                    ? 'bg-foreground text-background'
                    : isCompleted
                      ? 'bg-black/10 dark:bg-white/10'
                      : 'bg-black/5 dark:bg-white/5'
                }`}
              >
                {step}
              </span>
              {label}
            </button>
            {step < STEP_LABELS.length ? (
              <span className="text-black/20 dark:text-white/20">—</span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
