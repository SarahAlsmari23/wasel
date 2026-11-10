import type { ReactNode } from 'react'
import { AuthTopBar } from '@/components/auth/auth-top-bar'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background wasel-canvas flex min-h-dvh flex-col">
      <AuthTopBar />
      <main id="main-content" className="flex flex-1 items-center justify-center px-5 pt-4 pb-12">
        {children}
      </main>
    </div>
  )
}
