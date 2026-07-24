import Link from 'next/link'
import { ComplaintList } from '@/components/complaints/complaint-list'
import { MOCK_COMPLAINTS } from '@/lib/mock/complaints'

export default function ComplaintsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">الشكاوى</h1>
          <p className="mt-1 text-sm text-gray-600">
            استعرض حالة الشكاوى التي قدمتها وتابع تحديثاتها.
          </p>
        </div>
        <Link
          href="/complaints/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          إنشاء شكوى جديدة
        </Link>
      </div>
      <ComplaintList complaints={MOCK_COMPLAINTS} />
    </div>
  )
}
