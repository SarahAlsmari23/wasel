'use client'

import { Home, Menu } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { Sidebar } from '@/components/dashboard/sidebar'
import { SignOutModal } from '@/components/dashboard/sign-out-modal'
import { UserMenu } from '@/components/dashboard/user-menu'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useCopy } from '@/components/i18n/locale-provider'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: { openMenu: 'فتح القائمة', home: 'الرئيسية', wasel: 'اسأل واصل' },
  en: { openMenu: 'Open menu', home: 'Home', wasel: 'Ask Wasel' },
})

type DashboardShellProps = {
  userName: string
  userEmail: string
  children: ReactNode
}

/**
 * The authenticated area's shell: the functional sidebar (desktop) / bottom
 * bar (mobile), plus a slim top bar that keeps the public site one click
 * away — Home and Wasel — alongside language, theme and the account menu.
 */
export function DashboardShell({ userName, userEmail, children }: DashboardShellProps) {
  const copy = useCopy(COPY)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)

  return (
    <div className="bg-background flex min-h-dvh">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOutClick={() => {
          setIsSidebarOpen(false)
          setIsSignOutOpen(true)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/85 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-lg md:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={copy.openMenu}
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
              className="text-foreground border-border hover:bg-primary/5 rounded-xl border p-2.5 transition-colors lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="text-muted-foreground hover:bg-primary/5 hover:text-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                {copy.home}
              </Link>
              <Link
                href="/wasal"
                className="text-muted-foreground hover:bg-primary/5 hover:text-primary rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {copy.wasel}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu
              userName={userName}
              userEmail={userEmail}
              onSignOutClick={() => setIsSignOutOpen(true)}
            />
          </div>
        </header>

        {/* pb-24 clears the mobile bottom nav so content is never hidden. */}
        <main id="main-content" className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <BottomNav />
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
    </div>
  )
}
