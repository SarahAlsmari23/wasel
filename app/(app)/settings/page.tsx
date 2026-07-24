import { EmptyState } from '@/components/empty-state'

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">الإعدادات</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          إدارة إعدادات حسابك وتفضيلاتك في وصال.
        </p>
      </div>
      <EmptyState
        title="لا توجد إعدادات متاحة بعد"
        description="ستتوفر خيارات إدارة الحساب هنا قريباً."
      />
    </div>
  )
}
