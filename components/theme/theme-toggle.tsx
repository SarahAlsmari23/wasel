'use client'

import { Moon, Sun } from 'lucide-react'
import { useCopy } from '@/components/i18n/locale-provider'
import { useTheme } from '@/components/theme/theme-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

/**
 * Flips between light and dark. Settings keeps the three-way choice including
 * "follow the system"; this is the quick switch.
 */
const COPY = defineCopy({
  ar: { toDark: 'تفعيل الوضع الداكن', toLight: 'تفعيل الوضع الفاتح' },
  en: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode' },
})

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, setPreference } = useTheme()
  const copy = useCopy(COPY)
  const next = resolved === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? copy.toDark : copy.toLight

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={label}
      title={label}
      className={cn(
        'text-muted-foreground hover:bg-surface-tint hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200',
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
