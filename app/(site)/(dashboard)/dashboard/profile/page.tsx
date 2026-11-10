import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { ProfileView } from '@/components/dashboard/profile-view'
import { getUserProfile } from '@/lib/auth/user-profile'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { getCurrentUser } from '@/lib/auth/current-user'

const COPY = defineCopy({
  ar: { title: 'الملف الشخصي', description: 'بيانات حسابك في واصل.' },
  en: { title: 'Profile', description: 'Your Wasel account details.' },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].title }
}

export default async function ProfilePage() {
  const copy = COPY[await getLocale()]
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard/profile')}`)
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader title={copy.title} description={copy.description} />
      <ProfileView profile={getUserProfile(user)} />
    </div>
  )
}
