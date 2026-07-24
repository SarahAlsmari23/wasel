import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ComplaintDraftPreview } from '@/components/complaints/complaint-draft-preview'
import { ComplaintStatusBadge } from '@/components/complaints/complaint-status-badge'
import { getMockComplaintById } from '@/lib/mock/complaints'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const complaint = getMockComplaintById(id)

  if (!complaint) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <Link
            href="/complaints"
            className="mb-1 inline-block text-xs font-medium text-gray-600 underline"
          >
            العودة إلى الشكاوى
          </Link>
          <h1 className="text-foreground text-xl font-semibold">{complaint.title}</h1>
          <p className="text-sm text-gray-600">
            {complaint.entityName} · {complaint.categoryName}
          </p>
        </div>
        <ComplaintStatusBadge status={complaint.status} />
      </div>

      <div className="bg-surface rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-foreground mb-3 text-sm font-semibold">سجل الشكوى</h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-600">
          {complaint.timeline.map((event) => (
            <li key={event.at} className="flex items-center justify-between gap-3">
              <span>{event.label}</span>
              <span className="text-xs">{formatDate(event.at)}</span>
            </li>
          ))}
        </ul>
      </div>

      <ComplaintDraftPreview draftText={complaint.draftText} />
    </div>
  )
}
