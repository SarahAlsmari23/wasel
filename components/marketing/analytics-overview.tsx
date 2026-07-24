import { Card } from '@/components/ui/card'
import {
  SAMPLE_ACTIVITY,
  SAMPLE_COMPLAINT_TYPES,
  SAMPLE_ENTITY_DISTRIBUTION,
  type SampleChartItem,
} from '@/lib/mock/marketing-stats'

function MiniBarChart({ title, items }: { title: string; items: SampleChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value))
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-gray-600" title={item.label}>
              {item.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-left text-xs text-gray-400">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsOverview() {
  return (
    <Card className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-xl font-semibold">إحصائيات الشكاوى</h2>
          <p className="mt-1 text-sm text-gray-600">
            اطلع على ملخص تحليلي لأنواع الشكاوى الأكثر شيوعًا والجهات التي يتم ترشيحها بشكل متكرر.
          </p>
        </div>
        <span className="bg-secondary/15 text-secondary rounded-full px-3 py-1 text-xs font-medium">
          بيانات توضيحية
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <MiniBarChart title="أكثر أنواع الشكاوى" items={SAMPLE_COMPLAINT_TYPES} />
        <MiniBarChart title="توزيع الشكاوى حسب الجهة" items={SAMPLE_ENTITY_DISTRIBUTION} />
        <MiniBarChart title="نشاط الشكاوى" items={SAMPLE_ACTIVITY} />
      </div>
    </Card>
  )
}
