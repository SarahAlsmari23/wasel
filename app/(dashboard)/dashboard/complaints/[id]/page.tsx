import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ComplaintDetail } from '@/components/dashboard/complaint-detail'
import { getMockComplaintById } from '@/lib/mock/complaints'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const complaint = getMockComplaintById(id)
  return { title: complaint?.title ?? 'البلاغ' }
}

export default async function ComplaintDetailPage({ params }: PageProps) {
  const { id } = await params
  const complaint = getMockComplaintById(id)

  if (!complaint) {
    notFound()
  }

  return <ComplaintDetail complaint={complaint} />
}
