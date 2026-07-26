'use client'

import { Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { Sidebar } from '@/components/dashboard/sidebar'
import { SignOutModal } from '@/components/dashboard/sign-out-modal'
import { UserMenu } from '@/components/dashboard/user-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type DashboardShellProps = {
  userName: string
  userEmail: string
  children: ReactNode
}

export function DashboardShell({ userName, userEmail, children }: DashboardShellProps) {
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
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="فتح القائمة"
            className="text-foreground border-border hover:bg-primary/5 rounded-xl border p-2.5 transition-colors lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              userName={userName}
              userEmail={userEmail}
              onSignOutClick={() => setIsSignOutOpen(true)}
            />
          </div>
        </header>

        {/* pb-20 clears the mobile bottom nav so content is never hidden. */}
        <main id="main-content" className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <BottomNav />
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
    </div>
  )
}
