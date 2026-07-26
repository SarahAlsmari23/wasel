import { cn } from '@/lib/utils/cn'

type SpinnerProps = {
  className?: string
  label?: string
}

export function Spinner({ className = 'h-4 w-4', label = 'جارٍ التحميل' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}
