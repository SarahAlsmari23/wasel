'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Globe, LogOut, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: {
    homeAria: 'واصل — الصفحة الرئيسية',
    closeMenu: 'إغلاق القائمة',
    navLabel: 'تنقل لوحة التحكم',
    website: 'العودة إلى الموقع',
    signOut: 'تسجيل الخروج',
  },
  en: {
    homeAria: 'Wasel — home',
    closeMenu: 'Close menu',
    navLabel: 'Dashboard navigation',
    website: 'Back to website',
    signOut: 'Sign out',
  },
})

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  onSignOutClick: () => void
}

export function Sidebar({ isOpen, onClose, onSignOutClick }: SidebarProps) {
  const pathname = usePathname()
  const copy = useCopy(COPY)
  const locale = useLocale()

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="bg-overlay fixed inset-0 z-40 backdrop-blur-[2px] lg:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        id="dashboard-sidebar"
        className={cn(
          'wasel-sidebar border-sidebar-border text-sidebar-foreground fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e px-3 py-4 transition-transform duration-300 ease-[var(--ease-out-soft)] lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-64 lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="mb-7 flex items-center justify-between px-2.5 pt-1">
          <Link href="/" aria-label={copy.homeAria} className="rounded-lg">
            <WaselLogo variant="horizontal" size="sm" tone="inverse" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeMenu}
            className="text-sidebar-muted hover:bg-sidebar-hover rounded-lg p-1.5 transition-colors hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={copy.navLabel} className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname)
            const Icon = item.icon

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="bg-sidebar-cta text-sidebar-cta-foreground hover:bg-sidebar-cta-hover mb-5 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-200"
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
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-sidebar-active before:bg-sidebar-indicator text-white before:absolute before:inset-y-2 before:-start-3 before:w-[3px] before:rounded-e-full'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive && 'text-sidebar-indicator')}
                  aria-hidden="true"
                />
                {item.label[locale]}
              </Link>
            )
          })}
        </nav>

        <div className="border-sidebar-border mt-4 flex flex-col gap-0.5 border-t pt-4">
          <Link
            href="/"
            onClick={onClose}
            className="text-sidebar-muted hover:bg-sidebar-hover flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 hover:text-white"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {copy.website}
          </Link>
          <button
            type="button"
            onClick={onSignOutClick}
            className="text-sidebar-muted hover:bg-sidebar-hover flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 hover:text-[#ff9a9e]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {copy.signOut}
          </button>
        </div>
      </aside>
    </>
  )
}
