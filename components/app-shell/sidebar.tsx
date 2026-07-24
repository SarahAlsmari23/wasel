'use client'

import { BookOpen, FileText, LayoutDashboard, MessagesSquare, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/conversations', label: 'المحادثات', icon: MessagesSquare },
  { href: '/complaints', label: 'الشكاوى', icon: FileText },
  { href: '/knowledge', label: 'إدارة المعرفة', icon: BookOpen },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
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
        className={`bg-surface fixed inset-y-0 right-0 z-40 w-64 p-4 shadow-xl transition-transform md:static md:z-auto md:w-64 md:translate-x-0 md:border-l md:border-gray-200 md:shadow-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <p className="text-primary mb-8 px-2 text-xl font-semibold">وصال</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
