'use client'

import { SignOutButton } from '@/components/auth/sign-out-button'

type TopbarProps = {
  userEmail: string | null
  onMenuClick: () => void
}

export function Topbar({ userEmail, onMenuClick }: TopbarProps) {
  return (
    <header className="bg-background sticky top-0 z-20 flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium md:hidden dark:border-white/20"
        aria-label="فتح القائمة"
      >
        القائمة
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {userEmail ? <p className="text-sm text-black/60 dark:text-white/60">{userEmail}</p> : null}
        <SignOutButton />
      </div>
    </header>
  )
}
