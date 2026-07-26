import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeScript } from '@/components/theme/theme-script'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-sans-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'واصل — خلها توصل صح',
    template: '%s | واصل',
  },
  description:
    'واصل منصة ذكية لتوجيه البلاغات الحكومية: تساعدك على فهم شكواك، وتحديد الجهة الحكومية المناسبة، وصياغة البلاغ باحترافية قبل إرساله.',
  icons: {
    icon: [{ url: '/brand/wasel-logo.webp', type: 'image/webp' }],
    apple: [{ url: '/brand/wasel-logo.webp', type: 'image/webp' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#081C34' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${ibmPlexSansArabic.variable} antialiased`}>
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only rounded-xl px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[70]"
        >
          تخطي إلى المحتوى الرئيسي
        </a>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
