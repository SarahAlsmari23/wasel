import type { ReactNode } from 'react'
import { AuthTopBar } from '@/components/auth/auth-top-bar'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="bg-background wasel-canvas relative flex min-h-screen items-center justify-center px-5 py-12"
    >
      <AuthTopBar />
      {children}
    </main>
  )
}
