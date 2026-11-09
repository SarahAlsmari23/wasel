import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeScript } from '@/components/theme/theme-script'
import { ToastProvider } from '@/components/ui/toast'
import { defineCopy, directionFor, htmlLangFor } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import './globals.css'

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-sans-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const COPY = defineCopy({
  ar: {
    title: 'واصل — خلها توصل صح',
    template: '%s | واصل',
    description:
      'واصل مساعد ذكي يساعدك على فهم شكواك، وتحديد الجهة الحكومية المختصة، وصياغة بلاغ رسمي واضح قبل تقديمه بنفسك عبر القناة الرسمية.',
    skipToContent: 'تخطي إلى المحتوى الرئيسي',
  },
  en: {
    title: 'Wasel — Get it to the right place',
    template: '%s | Wasel',
    description:
      'Wasel is an AI assistant that helps you understand your complaint, identify the responsible Saudi government authority, and draft a clear formal complaint to submit yourself through the official channel.',
    skipToContent: 'Skip to main content',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  const copy = COPY[await getLocale()]
  return {
    title: { default: copy.title, template: copy.template },
    description: copy.description,
    icons: {
      icon: [{ url: '/brand/wasel-logo.webp', type: 'image/webp' }],
      apple: [{ url: '/brand/wasel-logo.webp', type: 'image/webp' }],
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#081C34' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const copy = COPY[locale]

  return (
    <html lang={htmlLangFor(locale)} dir={directionFor(locale)} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${ibmPlexSansArabic.variable} antialiased`}>
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only rounded-xl px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[70]"
        >
          {copy.skipToContent}
        </a>
        <LocaleProvider locale={locale}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
