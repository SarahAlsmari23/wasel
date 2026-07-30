import Link from 'next/link'
import { WaselLogo } from '@/components/brand/wasel-logo'

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/wasal', label: 'واصل' },
  { href: '/entities', label: 'الجهات الحكومية' },
  { href: '/about', label: 'عن واصل' },
]

// Privacy policy / terms do not exist yet as real pages — rendered as muted,
// non-navigating labels rather than linking to content that isn't written.
const PENDING_LINKS = ['سياسة الخصوصية', 'الشروط والأحكام']

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-3">
          <WaselLogo variant="horizontal" size="sm" />
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            صُمِّم واصل لمساعدتك على فهم الاستفسارات الحكومية، وتحديد الجهة المختصة، وصياغة الشكاوى
            والبلاغات بصيغة رسمية وواضحة قبل تقديمها.
          </p>
        </div>

        <nav aria-label="روابط التذييل" className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-semibold">روابط سريعة</p>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-semibold">تواصل معنا</p>
          {PENDING_LINKS.map((label) => (
            <span key={label} className="text-muted-foreground/60 text-sm" title="سيتوفر قريباً">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="border-border text-muted-foreground border-t px-5 py-5 text-center text-xs md:px-6">
        جميع الحقوق محفوظة © واصل {new Date().getFullYear()}
      </div>
    </footer>
  )
}
