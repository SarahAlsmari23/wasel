import { EmptyState } from '@/components/empty-state'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          نظرة عامة على نشاطك في وصال.
        </p>
      </div>
      <EmptyState
        title="لا توجد بيانات لعرضها بعد"
        description="ستظهر هنا ملخصات محادثاتك وشكاواك بمجرد توفرها."
      />
    </div>
  )
}
