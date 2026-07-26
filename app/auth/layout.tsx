import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="bg-background wasel-canvas flex min-h-screen items-center justify-center px-5 py-12"
    >
      {children}
    </main>
  )
}
