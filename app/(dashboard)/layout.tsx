import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getUserProfile } from '@/lib/auth/user-profile'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The dashboard is for authenticated users only (Phase 3). Guests who land
  // here are sent to sign-in and returned once they are in.
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard')}`)
  }

  const profile = getUserProfile(user)

  return (
    <DashboardShell userName={profile.name} userEmail={profile.email}>
      {children}
    </DashboardShell>
  )
}
