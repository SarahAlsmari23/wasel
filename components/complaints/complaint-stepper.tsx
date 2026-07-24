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
              className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                isCurrent
                  ? 'text-foreground font-semibold'
                  : isCompleted
                    ? 'text-gray-600'
                    : 'text-gray-300'
              } ${isClickable ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step}
              </span>
              {label}
            </button>
            {step < STEP_LABELS.length ? <span className="text-gray-300">—</span> : null}
          </li>
        )
      })}
    </ol>
  )
}
