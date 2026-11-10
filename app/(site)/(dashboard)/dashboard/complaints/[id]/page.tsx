import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintDetail } from '@/components/dashboard/complaint-detail'
import { getDisplayTitle } from '@/lib/complaints/display'
import { getComplaintById } from '@/lib/db/complaints'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const supabase = await createClient()
  const complaint = await getComplaintById(supabase, id)
  return {
    title: complaint
      ? getDisplayTitle({ title: complaint.title, complaintSubject: complaint.subject }, locale)
      : locale === 'en'
        ? 'Complaint'
        : 'البلاغ',
  }
}

export default async function ComplaintDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const complaint = await getComplaintById(supabase, id)

  if (!complaint) {
    notFound()
  }

  return <ComplaintDetail complaint={complaint} />
}
