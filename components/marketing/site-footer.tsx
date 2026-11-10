import Link from 'next/link'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    about:
      'صُمِّم واصل لمساعدتك على فهم الاستفسارات الحكومية، وتحديد الجهة المختصة، وصياغة الشكاوى والبلاغات بصيغة رسمية وواضحة قبل تقديمها.',
    quickLinks: 'روابط سريعة',
    footerNav: 'روابط التذييل',
    contact: 'تواصل معنا',
    links: [
      { href: '/', label: 'الرئيسية' },
      { href: '/wasal', label: 'واصل' },
      { href: '/entities', label: 'الجهات الحكومية' },
      { href: '/about', label: 'عن واصل' },
    ],
    legalLinks: [
      { href: '/privacy', label: 'سياسة الخصوصية' },
      { href: '/terms', label: 'الشروط والأحكام' },
    ],
    rights: 'جميع الحقوق محفوظة © واصل',
  },
  en: {
    about:
      'Wasel helps you understand government enquiries, identify the responsible authority, and draft complaints in a clear, formal format before you submit them.',
    quickLinks: 'Quick links',
    footerNav: 'Footer links',
    contact: 'Contact us',
    links: [
      { href: '/', label: 'Home' },
      { href: '/wasal', label: 'Wasel' },
      { href: '/entities', label: 'Government authorities' },
      { href: '/about', label: 'About Wasel' },
    ],
    legalLinks: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms and conditions' },
    ],
    rights: 'All rights reserved © Wasel',
  },
})

export async function SiteFooter() {
  const copy = COPY[await getLocale()]

  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-3">
          <WaselLogo variant="horizontal" size="sm" />
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">{copy.about}</p>
        </div>

        <nav aria-label={copy.footerNav} className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-semibold">{copy.quickLinks}</p>
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Privacy policy and terms now exist, so these are real links. */}
        <div className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-semibold">{copy.contact}</p>
          {copy.legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-border text-muted-foreground border-t px-5 py-5 text-center text-xs md:px-6">
        {copy.rights} {new Date().getFullYear()}
      </div>
    </footer>
  )
}
