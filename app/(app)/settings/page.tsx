import { Bell, Palette, User } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Card } from '@/components/ui/card'

const SECTIONS = [
  {
    icon: User,
    title: 'الحساب',
    description: 'إدارة البريد الإلكتروني وبيانات الحساب الأساسية.',
  },
  {
    icon: Palette,
    title: 'المظهر',
    description: 'وصال يعتمد مظهراً فاتحاً موحداً حالياً.',
  },
  {
    icon: Bell,
    title: 'الإشعارات',
    description: 'التحكم في إشعارات المحادثات والشكاوى.',
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">الإعدادات</h1>
        <p className="mt-1 text-sm text-gray-600">إدارة إعدادات حسابك وتفضيلاتك في وصال.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="flex flex-col gap-3">
              <span className="bg-secondary/15 text-secondary flex h-9 w-9 items-center justify-center rounded-full">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-foreground text-sm font-medium">{section.title}</p>
                <p className="mt-1 text-sm text-gray-600">{section.description}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <EmptyState
        title="لا توجد إعدادات قابلة للتعديل بعد"
        description="ستتوفر خيارات إدارة الحساب هنا قريباً."
      />
    </div>
  )
}
