'use client'

import { AnimatePresence, motion } from 'motion/react'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useCopy } from '@/components/i18n/locale-provider'
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
    homeAria: 'واصل — الصفحة الرئيسية',
    mainNav: 'التنقل الرئيسي',
    mobileNav: 'التنقل للجوال',
    dashboard: 'لوحة التحكم',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
  },
  en: {
    links: [
      { href: '/', label: 'Home' },
      { href: '/wasal', label: 'Wasel' },
      { href: '/entities', label: 'Government authorities' },
      { href: '/about', label: 'About Wasel' },
    ],
    homeAria: 'Wasel — home',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
    dashboard: 'Dashboard',
    signIn: 'Sign in',
    signUp: 'Create account',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
})

type SiteHeaderProps = {
  isAuthenticated: boolean
}

export function SiteHeader({ isAuthenticated }: SiteHeaderProps) {
  const pathname = usePathname()
  const copy = useCopy(PUBLIC_NAV_COPY)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // A route change while the drawer is open would otherwise leave it hanging.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Signing in from any public page returns the user to that same page.
  const signInHref = authHrefWithReturn('/auth/sign-in', pathname)
  const signUpHref = authHrefWithReturn('/auth/sign-up', pathname)

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        isScrolled
          ? 'bg-background/85 border-border border-b backdrop-blur-lg'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-6">
        <Link href="/" aria-label={copy.homeAria} className="shrink-0">
          <WaselLogo variant="horizontal" size="sm" priority />
        </Link>

        <nav aria-label={copy.mainNav} className="hidden items-center gap-1 lg:flex">
          {copy.links.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                  'after:bg-primary after:absolute after:inset-x-3.5 after:-bottom-[1.0625rem] after:h-0.5 after:rounded-full after:transition-opacity after:duration-200',
                  isActive
                    ? 'text-heading after:opacity-100'
                    : 'text-muted-foreground hover:text-heading after:opacity-0',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <span aria-hidden="true" className="bg-border mx-1.5 h-5 w-px" />
          {isAuthenticated ? (
            <Link href="/dashboard" className={buttonClasses('primary', 'sm', 'ms-1')}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {copy.dashboard}
            </Link>
          ) : (
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
            className="text-foreground border-border hover:bg-primary/5 rounded-xl border p-2.5 transition-colors duration-200"
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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface border-border overflow-hidden border-t lg:hidden"
          >
            <nav aria-label={copy.mobileNav} className="flex flex-col gap-1 px-5 py-4">
              {copy.links.map((link) => {
                const isActive =
                  link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-primary bg-primary/8' : 'text-foreground hover:bg-primary/5',
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}

              <div className="border-border mt-3 flex flex-col gap-2 border-t pt-4">
                {isAuthenticated ? (
                  <Link href="/dashboard" className={buttonClasses('primary', 'md', 'w-full')}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    {copy.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link href={signInHref} className={buttonClasses('outline', 'md', 'w-full')}>
                      {copy.signIn}
                    </Link>
                    <Link href={signUpHref} className={buttonClasses('primary', 'md', 'w-full')}>
                      {copy.signUp}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
