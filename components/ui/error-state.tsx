'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

type ErrorStateProps = {
  title: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title,
  description,
  retryLabel = 'إعادة المحاولة',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-danger/25 bg-danger/4 flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center',
        className,
      )}
    >
      <span className="bg-danger/10 text-danger flex h-12 w-12 items-center justify-center rounded-2xl">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-foreground text-base font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
