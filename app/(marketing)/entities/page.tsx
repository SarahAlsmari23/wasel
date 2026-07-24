import { AuthoritiesGrid } from '@/components/marketing/authorities-grid'
import { MARKETING_ENTITIES } from '@/lib/mock/marketing-entities'

export default function EntitiesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">الجهات الحكومية</h1>
        <p className="mt-1 text-sm text-gray-600">
          يستطيع وصال مساعدتك في توجيه شكواك إلى الجهات الحكومية التالية.
        </p>
      </div>
      <AuthoritiesGrid
        entities={MARKETING_ENTITIES}
        actionLabel="زيارة الموقع"
        getActionHref={(entity) => entity.officialUrl}
      />
    </div>
  )
}
