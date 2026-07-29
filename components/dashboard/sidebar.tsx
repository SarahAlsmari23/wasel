'use client'

import { AnimatePresence, motion } from 'motion/react'
import { LogOut, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { cn } from '@/lib/utils/cn'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  onSignOutClick: () => void
}

export function Sidebar({ isOpen, onClose, onSignOutClick }: SidebarProps) {
  const pathname = usePathname()

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
            className="fixed inset-0 z-40 bg-[#12355B]/35 backdrop-blur-[2px] lg:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          'bg-surface border-border fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l p-4 transition-transform duration-300 lg:static lg:z-auto lg:w-64 lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2 pt-1">
          <Link href="/" aria-label="واصل — الصفحة الرئيسية">
            <WaselLogo variant="horizontal" size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="text-muted-foreground hover:bg-primary/6 hover:text-foreground rounded-lg p-1.5 transition-colors lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="تنقل لوحة التحكم" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname)
            const Icon = item.icon

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 mb-3 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
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
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
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
          تسجيل الخروج
        </button>
      </aside>
    </>
  )
}
