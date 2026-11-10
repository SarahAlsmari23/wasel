import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { SettingsView } from '@/components/dashboard/settings-view'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: { title: 'الإعدادات', description: 'تحكّم في تفضيلاتك وخصوصية حسابك.' },
  en: { title: 'Settings', description: 'Manage your preferences and account privacy.' },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].title }
}

export default async function SettingsPage() {
  const copy = COPY[await getLocale()]
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent('/dashboard/settings')}`)
  }

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader title={copy.title} description={copy.description} />
      <SettingsView />
    </div>
  )
}
