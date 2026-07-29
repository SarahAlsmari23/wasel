import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils/cn'

const CONTROL_CLASSES =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

type FieldProps = {
  /** Must match the `id` of the control rendered as a child. */
  htmlFor: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ htmlFor, label, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-foreground text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASSES, className)} {...props} />
}

export function TextArea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_CLASSES, 'resize-none', className)} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL_CLASSES, 'cursor-pointer', className)} {...props} />
}
