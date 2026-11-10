'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: {
    navLabel: 'تنقل لوحة التحكم',
    signOut: 'تسجيل الخروج',
  },
  en: {
    navLabel: 'Dashboard navigation',
    signOut: 'Sign out',
  },
})

type SidebarProps = {
  onSignOutClick: () => void
}

/**
 * Desktop dashboard navigation. It sits on the reading-start edge (right in
 * Arabic, left in English) directly below the shared site header, and stays
 * in view while the content scrolls: `--site-header-h` is the header's
 * measured height (see SiteHeader), so the offset follows the real layout.
 * Its own contents scroll if they ever exceed the available height.
 */
export function Sidebar({ onSignOutClick }: SidebarProps) {
  const pathname = usePathname()
  const copy = useCopy(COPY)
  const locale = useLocale()

  return (
    <aside
      id="dashboard-sidebar"
      className="bg-surface border-border sticky top-(--site-header-h) hidden h-[calc(100dvh-var(--site-header-h))] w-64 shrink-0 flex-col self-start overflow-y-auto border-e p-4 lg:flex"
    >
      <nav aria-label={copy.navLabel} className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname)
          const Icon = item.icon

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 mb-3 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label[locale]}
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/8 text-primary'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label[locale]}
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={onSignOutClick}
        className="text-muted-foreground hover:bg-danger/6 hover:text-danger mt-4 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {copy.signOut}
      </button>
    </aside>
  )
}
