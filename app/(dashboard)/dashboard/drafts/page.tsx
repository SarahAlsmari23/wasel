import { SquarePen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DraftsList } from '@/components/dashboard/drafts-list'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserDrafts } from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'المسودات',
}

export default async function DraftsPage() {
  const supabase = await createClient()
  const drafts = await getUserDrafts(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        title="المسودات المحفوظة"
        description="بلاغات لم تكتمل بعد — أكملها متى ما أردت."
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            <SquarePen className="h-4 w-4" aria-hidden="true" />
            بلاغ جديد
          </Link>
        }
      />

      <DraftsList drafts={drafts} />
    </div>
  )
}
