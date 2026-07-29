import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from '@/components/ui/spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-lift active:translate-y-px',
  secondary:
    'bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/90 active:translate-y-px',
  outline:
    'border border-border bg-surface text-heading hover:border-primary/30 hover:bg-surface-tint hover:text-primary',
  danger: 'bg-danger text-danger-foreground shadow-soft hover:bg-danger/90 active:translate-y-px',
  ghost: 'text-foreground hover:bg-surface-tint hover:text-primary',
  subtle: 'bg-surface-tint text-primary hover:bg-primary/12',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

/**
 * Shared with <Link>-based call-to-actions so an anchor and a button styled as
 * the same variant are pixel-identical.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}
