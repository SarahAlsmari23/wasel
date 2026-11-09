import { cn } from '@/lib/utils/cn'

type SpinnerProps = {
  className?: string
  /** Accessible name. Omit when the surrounding control already conveys the
   * busy state (e.g. a button with aria-busy and its own label). */
  label?: string
}

export function Spinner({ className = 'h-4 w-4', label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}
