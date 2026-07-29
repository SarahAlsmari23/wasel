import Link from 'next/link'
import type { ReactNode } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'

type AuthCardProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="animate-fade-up w-full max-w-md">
      <Link href="/" className="mb-6 flex justify-center" aria-label="واصل — الصفحة الرئيسية">
        <WaselLogo size="lg" />
      </Link>

      <div className="bg-surface border-border shadow-lift rounded-3xl border p-7 sm:p-8">
        <div className="mb-7 text-center">
          <h1 className="text-heading text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
        </div>
        {children}
      </div>

      <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
    </div>
  )
}

export function AuthDivider() {
  return (
    <div className="text-muted-foreground my-5 flex items-center gap-3 text-xs">
      <span className="bg-border h-px flex-1" />
      أو
      <span className="bg-border h-px flex-1" />
    </div>
  )
}
