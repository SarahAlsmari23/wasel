import { FileText, MessagesSquare, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { MOCK_COMPLAINTS } from '@/lib/mock/complaints'
import { MOCK_CONVERSATIONS } from '@/lib/mock/conversations'

export default function DashboardPage() {
  const activeConversations = MOCK_CONVERSATIONS.filter((c) => c.status === 'active').length
  const readyComplaints = MOCK_COMPLAINTS.filter((c) => c.status === 'ready').length

  const stats = [
    {
      label: 'محادثات نشطة',
      value: activeConversations,
      icon: MessagesSquare,
    },
    {
      label: 'إجمالي المحادثات',
      value: MOCK_CONVERSATIONS.length,
      icon: MessagesSquare,
    },
    {
      label: 'شكاوى جاهزة',
      value: readyComplaints,
      icon: FileText,
    },
    {
      label: 'إجمالي الشكاوى',
      value: MOCK_COMPLAINTS.length,
      icon: FileText,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-gray-600">نظرة عامة على نشاطك في وصال.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="flex flex-col gap-3">
              <span className="bg-secondary/15 text-secondary flex h-9 w-9 items-center justify-center rounded-full">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-foreground text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-foreground text-sm font-semibold">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/conversations"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            بدء محادثة جديدة
          </Link>
          <Link
            href="/complaints/new"
            className="text-foreground inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            إنشاء شكوى جديدة
          </Link>
        </div>
      </Card>
    </div>
  )
}
