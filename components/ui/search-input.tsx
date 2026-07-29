import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>

export function SearchInput({ className = '', ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="search"
        className={cn(
          'border-border bg-surface text-foreground placeholder:text-muted-foreground/70 focus:border-primary w-full rounded-xl border py-2.5 pr-10 pl-3.5 text-sm transition-colors focus:outline-none',
          className,
        )}
        {...props}
      />
    </div>
  )
}
