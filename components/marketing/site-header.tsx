'use client'

import { AnimatePresence, motion } from 'motion/react'
import { LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { isNavItemActive, NAV_ITEMS } from '@/components/dashboard/nav-items'
import { SignOutModal } from '@/components/dashboard/sign-out-modal'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { buttonClasses } from '@/components/ui/button'
import { authHrefWithReturn } from '@/lib/auth/redirect'
import { defineCopy } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

export const PUBLIC_NAV_COPY = defineCopy({
  ar: {
    links: [
      { href: '/', label: 'الرئيسية' },
      { href: '/wasal', label: 'واصل' },
      { href: '/entities', label: 'الجهات الحكومية' },
      { href: '/about', label: 'عن واصل' },
    ],
    /** Shown only to signed-in users, after the public links. */
    dashboard: { href: '/dashboard', label: 'لوحة التحكم' },
    homeAria: 'واصل — الصفحة الرئيسية',
    mainNav: 'التنقل الرئيسي',
    mobileNav: 'التنقل للجوال',
    dashboardSections: 'أقسام لوحة التحكم',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    signOut: 'تسجيل الخروج',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
  },
  en: {
    links: [
      { href: '/', label: 'Home' },
      { href: '/wasal', label: 'Wasel' },
      { href: '/entities', label: 'Government Authorities' },
      { href: '/about', label: 'About Wasel' },
    ],
    dashboard: { href: '/dashboard', label: 'Dashboard' },
    homeAria: 'Wasel — home',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
    dashboardSections: 'Dashboard sections',
    signIn: 'Sign in',
    signUp: 'Create account',
    signOut: 'Sign out',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
})

function isLinkActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

type SiteHeaderProps = {
  isAuthenticated: boolean
}

/**
 * The one header for the public website, the chat and the dashboard (mounted
 * once in app/(site)/layout.tsx). Dashboard sub-sections live in the
 * dashboard sidebar; below `lg`, where that sidebar is hidden, this header's
 * menu lists them while a dashboard page is open.
 */
export function SiteHeader({ isAuthenticated }: SiteHeaderProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const copy = useCopy(PUBLIC_NAV_COPY)
  const headerRef = useRef<HTMLElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Publishes the header's real height as --site-header-h so content that
  // must sit below it (the sticky dashboard sidebar) follows the layout
  // instead of a hard-coded number. Only the closed bar is measured; the
  // mobile menu opens below it.
  useEffect(() => {
    const bar = headerRef.current?.firstElementChild
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(([entry]) => {
      const height = Math.round(
        entry.borderBoxSize?.[0]?.blockSize ?? bar.getBoundingClientRect().height,
      )
      // +1 for the header's bottom border.
      root.style.setProperty('--site-header-h', `${height + 1}px`)
    })
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  // A route change while the drawer is open would otherwise leave it hanging.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Signing in from any public page returns the user to that same page,
  // rather than dropping them into the dashboard.
  const signInHref = authHrefWithReturn('/auth/sign-in', pathname)
  const signUpHref = authHrefWithReturn('/auth/sign-up', pathname)

  const links = isAuthenticated ? [...copy.links, copy.dashboard] : copy.links
  const isInDashboard = isAuthenticated && isLinkActive('/dashboard', pathname)

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        isScrolled || isInDashboard
          ? 'bg-background/85 border-border border-b backdrop-blur-lg'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-6">
        <Link href="/" aria-label={copy.homeAria}>
          <WaselLogo variant="horizontal" size="sm" priority />
        </Link>

        <nav aria-label={copy.mainNav} className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const isActive = isLinkActive(link.href, pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary bg-primary/8'
                    : 'text-foreground/80 hover:text-primary hover:bg-primary/5',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {isAuthenticated ? null : (
            <>
              <Link href={signInHref} className={buttonClasses('ghost', 'sm')}>
                {copy.signIn}
              </Link>
              <Link href={signUpHref} className={buttonClasses('primary', 'sm')}>
                {copy.signUp}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="text-foreground border-border hover:bg-primary/5 rounded-xl border p-2.5 transition-colors lg:hidden"
            aria-label={isMenuOpen ? copy.closeMenu : copy.openMenu}
            aria-expanded={isMenuOpen}
            aria-controls="site-mobile-menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isMenuOpen ? (
          <motion.div
            id="site-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface border-border max-h-[calc(100dvh-var(--site-header-h))] overflow-y-auto border-t lg:hidden"
          >
            <nav aria-label={copy.mobileNav} className="flex flex-col gap-1 px-5 py-4">
              {links.map((link) => {
                const isActive = isLinkActive(link.href, pathname)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'text-primary bg-primary/8' : 'text-foreground hover:bg-primary/5',
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {isInDashboard ? (
                <div className="border-border mt-3 flex flex-col gap-1 border-t pt-4">
                  <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold">
                    {copy.dashboardSections}
                  </p>
                  {NAV_ITEMS.map((item) => {
                    const isActive = !item.isPrimary && isNavItemActive(item.href, pathname)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'text-primary bg-primary/8'
                            : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.label[locale]}
                      </Link>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsSignOutOpen(true)
                    }}
                    className="text-muted-foreground hover:bg-danger/6 hover:text-danger flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {copy.signOut}
                  </button>
                </div>
              ) : null}

              {isAuthenticated ? null : (
                <div className="border-border mt-3 flex flex-col gap-2 border-t pt-4">
                  <Link href={signInHref} className={buttonClasses('outline', 'md', 'w-full')}>
                    {copy.signIn}
                  </Link>
                  <Link href={signUpHref} className={buttonClasses('primary', 'md', 'w-full')}>
                    {copy.signUp}
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isInDashboard ? (
        <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
      ) : null}
    </header>
  )
}
