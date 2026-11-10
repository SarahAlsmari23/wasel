'use client'

import { useState, type ReactNode } from 'react'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { Sidebar } from '@/components/dashboard/sidebar'
import { SignOutModal } from '@/components/dashboard/sign-out-modal'

/**
 * The dashboard area below the shared site header: the sidebar on the
 * reading-start edge (desktop) and the content beside it. Phones use the
 * bottom navigation; below `lg` the header's menu lists the dashboard
 * sections, so there is no second header or drawer here.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)

  return (
    <div className="flex flex-1">
      <Sidebar onSignOutClick={() => setIsSignOutOpen(true)} />

      {/* pb-24 clears the mobile bottom nav so content is never hidden. */}
      <main id="main-content" className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-8">
        {children}
      </main>

      <BottomNav />
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
    </div>
  )
}
