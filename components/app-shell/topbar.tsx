'use client'

import { Menu } from 'lucide-react'
import { SignOutButton } from '@/components/auth/sign-out-button'

type TopbarProps = {
  userEmail: string | null
  onMenuClick: () => void
}

export function Topbar({ userEmail, onMenuClick }: TopbarProps) {
  return (
    <header className="bg-surface sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 px-4 py-3 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-foreground flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium md:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
        القائمة
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {userEmail ? <p className="text-sm text-gray-600">{userEmail}</p> : null}
        <SignOutButton />
      </div>
    </header>
  )
}
