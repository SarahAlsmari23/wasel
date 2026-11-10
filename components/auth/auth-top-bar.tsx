'use client'

import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'

/**
 * Language and theme on the auth pages. Overlaid in the corner so the
 * original centred layout is unchanged; the logo above the card still links
 * home.
 */
export function AuthTopBar() {
  return (
    <div className="absolute end-4 top-4 flex items-center gap-1 md:end-6">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  )
}
