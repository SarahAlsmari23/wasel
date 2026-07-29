import { Home, SearchX } from 'lucide-react'
import Link from 'next/link'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { buttonClasses } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="bg-background wasel-canvas flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-16 text-center"
    >
      <Link href="/" aria-label="واصل — الصفحة الرئيسية">
        <WaselLogo size="lg" />
      </Link>

      <span className="bg-secondary/12 text-secondary animate-scale-in flex h-16 w-16 items-center justify-center rounded-2xl">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm font-medium">٤٠٤</p>
        <h1 className="text-heading text-2xl font-semibold sm:text-3xl">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          عذراً، الصفحة التي تبحث عنها غير متوفرة.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link href="/" className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}>
          <Home className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>
        <Link href="/wasal" className={buttonClasses('outline', 'md', 'w-full sm:w-auto')}>
          اسأل واصل
        </Link>
      </div>
    </main>
  )
}
