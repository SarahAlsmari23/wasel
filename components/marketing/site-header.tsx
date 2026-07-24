'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/conversations', label: 'وصال' },
  { href: '/entities', label: 'الجهات الحكومية' },
  { href: '/about', label: 'عن وصال' },
]

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-surface/95 sticky top-0 z-30 border-b border-gray-200 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-primary text-xl font-semibold">
          وصال
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/sign-in"
            className="text-foreground rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            إنشاء حساب
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="text-foreground rounded-lg border border-gray-200 p-2 md:hidden"
          aria-label="فتح القائمة"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="bg-surface border-t border-gray-200 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-foreground text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href="/auth/sign-in"
                onClick={() => setIsMenuOpen(false)}
                className="text-foreground rounded-xl border border-gray-300 px-4 py-2 text-center text-sm font-medium"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/auth/sign-up"
                onClick={() => setIsMenuOpen(false)}
                className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-center text-sm font-medium"
              >
                إنشاء حساب
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
