'use client'

import { cn } from '@/lib/utils/cn'

type ToggleSwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-foreground text-sm font-medium">{label}</span>
        {description ? <span className="text-muted-foreground text-xs">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-primary/15',
        )}
      >
        <span
          className={cn(
            'bg-surface shadow-soft absolute top-1 h-4 w-4 rounded-full transition-all duration-200',
            // RTL layout: "on" sits at the left edge of the track.
            checked ? 'left-1' : 'right-1',
          )}
        />
      </button>
    </div>
  )
}
