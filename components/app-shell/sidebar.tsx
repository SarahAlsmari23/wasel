'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'لوحة التحكم' },
  { href: '/conversations', label: 'المحادثات' },
  { href: '/complaints', label: 'الشكاوى' },
  { href: '/settings', label: 'الإعدادات' },
]

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`bg-background fixed inset-y-0 right-0 z-40 w-64 border-l border-black/10 p-4 transition-transform md:static md:z-auto md:w-64 md:translate-x-0 md:border-l dark:border-white/10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <p className="mb-6 px-2 text-lg font-semibold">وصال</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
