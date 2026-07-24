'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/app-shell/sidebar'
import { Topbar } from '@/components/app-shell/topbar'

type AppShellProps = {
  userEmail: string | null
  children: ReactNode
}

export function AppShell({ userEmail, children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userEmail={userEmail} onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
