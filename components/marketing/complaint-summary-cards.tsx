import { CheckCircle2, Clock, FileEdit } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SAMPLE_SUMMARY_STATS } from '@/lib/mock/marketing-stats'

const CARDS = [
  {
    icon: CheckCircle2,
    value: SAMPLE_SUMMARY_STATS.submitted,
    title: 'تم رفع الشكاوى',
    description: 'عدد الشكاوى التي تم تجهيزها وإرسالها إلى الجهات المختصة.',
  },
  {
    icon: Clock,
    value: SAMPLE_SUMMARY_STATS.inProgress,
    title: 'قيد المعالجة',
    description: 'الشكاوى التي لا تزال تحت المتابعة أو بانتظار الإجراء.',
  },
  {
    icon: FileEdit,
    value: SAMPLE_SUMMARY_STATS.drafts,
    title: 'المسودات',
    description: 'الشكاوى التي لم يتم إرسالها بعد ويمكنك استكمالها لاحقًا.',
  },
]

export function ComplaintSummaryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="bg-secondary/15 text-secondary rounded-full px-2 py-0.5 text-[11px] font-medium">
                بيانات توضيحية
              </span>
            </div>
            <p className="text-foreground text-3xl font-semibold">{card.value}</p>
            <p className="text-foreground text-sm font-medium">{card.title}</p>
            <p className="text-sm text-gray-600">{card.description}</p>
          </Card>
        )
      })}
    </div>
  )
}
