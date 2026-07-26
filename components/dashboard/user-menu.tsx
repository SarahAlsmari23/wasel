'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { UserAvatar } from '@/components/dashboard/user-avatar'

type UserMenuProps = {
  userName: string
  userEmail: string
  onSignOutClick: () => void
}

export function UserMenu({ userName, userEmail, onSignOutClick }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape — the menu has no overlay of its own.
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="hover:bg-primary/5 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors"
      >
        <UserAvatar name={userName} />
        <span className="hidden flex-col items-start sm:flex">
          <span className="text-foreground text-sm font-medium">{userName}</span>
          <span className="text-muted-foreground max-w-40 truncate text-xs">{userEmail}</span>
        </span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface border-border shadow-lift absolute top-full left-0 mt-2 w-56 overflow-hidden rounded-2xl border p-1.5"
          >
            <div className="border-border mb-1.5 border-b px-3 py-2.5 sm:hidden">
              <p className="text-foreground text-sm font-medium">{userName}</p>
              <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
            </div>

            <Link
              href="/dashboard/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="text-foreground hover:bg-primary/6 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              الملف الشخصي
            </Link>
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="text-foreground hover:bg-primary/6 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              الإعدادات
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onSignOutClick()
              }}
              className="text-danger hover:bg-danger/6 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              تسجيل الخروج
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
