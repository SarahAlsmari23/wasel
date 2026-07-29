import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { SettingsView } from '@/components/dashboard/settings-view'
import { getUserProfile } from '@/lib/auth/user-profile'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'الإعدادات',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard/settings')}`)
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="الإعدادات" description="تحكّم في تفضيلاتك وخصوصية حسابك." />
      <SettingsView profile={getUserProfile(user)} />
    </div>
  )
}
