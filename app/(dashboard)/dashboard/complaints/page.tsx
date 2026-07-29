import { SquarePen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ComplaintsBrowser } from '@/components/dashboard/complaints-browser'
import { PageHeader } from '@/components/dashboard/page-header'
import { buttonClasses } from '@/components/ui/button'
import { getUserComplaints } from '@/lib/db/complaints'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'البلاغات السابقة',
}

export default async function ComplaintsPage() {
  const supabase = await createClient()
  const complaints = await getUserComplaints(supabase)

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-8">
      <PageHeader
        title="البلاغات السابقة"
        description="جميع البلاغات التي أعددتها مع واصل، مع حالتها والجهة المختصة بها."
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            <SquarePen className="h-4 w-4" aria-hidden="true" />
            بلاغ جديد
          </Link>
        }
      />

      <ComplaintsBrowser complaints={complaints} />
    </div>
  )
}
