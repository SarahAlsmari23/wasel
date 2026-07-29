'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/lib/utils/cn'

/**
 * Flips between light and dark. Settings keeps the three-way choice including
 * "follow the system"; this is the quick switch.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, setPreference } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={label}
      title={label}
      className={cn(
        'text-muted-foreground hover:bg-surface-tint hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
        className,
      )}
    >
      {resolved === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
