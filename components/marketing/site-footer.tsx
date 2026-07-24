import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/conversations', label: 'وصال' },
  { href: '/entities', label: 'الجهات الحكومية' },
  { href: '/about', label: 'عن وصال' },
]

// Privacy policy / terms / contact do not exist yet as real pages — rendered
// as muted, non-navigating labels rather than linking to fabricated content.
const PENDING_LINKS = ['سياسة الخصوصية', 'الشروط والأحكام', 'تواصل معنا']

export function SiteFooter() {
  return (
    <footer className="bg-surface border-t border-gray-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:justify-between">
        <div>
          <p className="text-primary text-lg font-semibold">وصال</p>
          <p className="mt-2 max-w-xs text-sm text-gray-600">
            منصة ذكية تساعدك على تحليل شكواك وتوجيهها إلى الجهة الحكومية المناسبة.
          </p>
        </div>

        <div className="flex flex-wrap gap-10">
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-semibold">روابط</p>
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-primary text-sm text-gray-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-semibold">قانوني</p>
            {PENDING_LINKS.map((label) => (
              <span key={label} className="text-sm text-gray-400" title="سيتوفر قريباً">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-4 text-center text-xs text-gray-400">
        جميع الحقوق محفوظة © وصال {new Date().getFullYear()}
      </div>
    </footer>
  )
}
