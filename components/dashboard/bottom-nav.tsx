'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.inBottomNav)

const COPY = defineCopy({ ar: { label: 'التنقل السريع' }, en: { label: 'Quick navigation' } })

export function BottomNav() {
  const pathname = usePathname()
  const locale = useLocale()
  const copy = useCopy(COPY)

  return (
    <nav
      aria-label={copy.label}
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item.href, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors duration-200',
              'before:bg-primary before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-b-full before:transition-opacity',
              isActive
                ? 'text-primary before:opacity-100'
                : 'text-muted-foreground before:opacity-0',
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            {(item.shortLabel ?? item.label)[locale]}
          </Link>
        )
      })}
    </nav>
  )
}
