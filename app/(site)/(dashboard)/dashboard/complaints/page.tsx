import { SquarePen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ComplaintsBrowser } from '@/components/dashboard/complaints-browser'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserComplaints } from '@/lib/db/complaints'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

const COPY = defineCopy({
  ar: {
    title: 'البلاغات السابقة',
    description: 'جميع البلاغات التي أعددتها مع واصل، مع حالتها والجهة المختصة بها.',
    new: 'بلاغ جديد',
  },
  en: {
    title: 'Previous complaints',
    description:
      "Every complaint you've prepared with Wasel, with its status and responsible authority.",
    new: 'New complaint',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await getLocale()].title }
}

export default async function ComplaintsPage() {
  const copy = COPY[await getLocale()]
  const supabase = await createClient()
  const complaints = await getUserComplaints(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-8">
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

      <ComplaintsBrowser complaints={complaints} />
    </div>
  )
}
