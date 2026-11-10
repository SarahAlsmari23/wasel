import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getCurrentUser } from '@/lib/auth/current-user'

// The shared header comes from app/(site)/layout.tsx; this layout adds the
// dashboard sidebar and content area below it.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  // The dashboard is for authenticated users only (Phase 3). Guests who land
  // here are sent to sign-in and returned once they are in.
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard')}`)
  }

  return <DashboardShell>{children}</DashboardShell>
}
