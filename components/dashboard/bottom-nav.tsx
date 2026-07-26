'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { cn } from '@/lib/utils/cn'

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.inBottomNav)

/** Mobile-only tab bar; the sidebar drawer covers the remaining routes. */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="التنقل السريع"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur-lg md:hidden"
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
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
