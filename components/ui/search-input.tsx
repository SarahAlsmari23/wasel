import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>

export function SearchInput({ className = '', ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        className={`bg-surface focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 py-2 pr-9 pl-3 text-sm placeholder:text-gray-400 focus:ring-1 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  )
}
