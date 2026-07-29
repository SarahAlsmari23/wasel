import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { ProfileView } from '@/components/dashboard/profile-view'
import { getUserProfile } from '@/lib/auth/user-profile'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'الملف الشخصي',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard/profile')}`)
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader title="الملف الشخصي" description="بيانات حسابك في واصل." />
      <ProfileView profile={getUserProfile(user)} />
    </div>
  )
}
