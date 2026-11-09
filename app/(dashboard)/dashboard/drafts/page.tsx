import { SquarePen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DraftsList } from '@/components/dashboard/drafts-list'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserDrafts } from '@/lib/db/conversations'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: {
    metaTitle: 'المسودات',
    title: 'المسودات المحفوظة',
    description: 'بلاغات لم تكتمل بعد — أكملها متى ما أردت.',
    new: 'بلاغ جديد',
  },
  en: {
    metaTitle: 'Drafts',
    title: 'Saved drafts',
    description: "Complaints you haven't finished yet — complete them whenever you like.",
    new: 'New complaint',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].metaTitle }
}

export default async function DraftsPage() {
  const copy = COPY[await getLocale()]
  const supabase = await createClient()
  const drafts = await getUserDrafts(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            <SquarePen className="h-4 w-4" aria-hidden="true" />
            {copy.new}
          </Link>
        }
      />

      <DraftsList drafts={drafts} />
    </div>
  )
}
