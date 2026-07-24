import { AnalyticsOverview } from '@/components/marketing/analytics-overview'
import { AuthoritiesGrid } from '@/components/marketing/authorities-grid'
import { ComplaintSummaryCards } from '@/components/marketing/complaint-summary-cards'
import { HeroSection } from '@/components/marketing/hero-section'
import { MARKETING_ENTITIES } from '@/lib/mock/marketing-entities'

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col gap-20 pb-24">
      <HeroSection />

      <section className="mx-auto w-full max-w-6xl px-6">
        <ComplaintSummaryCards />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6">
        <AnalyticsOverview />
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <div>
          <h2 className="text-foreground text-2xl font-semibold">الجهات الحكومية المدعومة</h2>
          <p className="mt-1 text-sm text-gray-600">
            يستطيع وصال مساعدتك في توجيه شكواك إلى الجهات الحكومية التالية.
          </p>
        </div>
        <AuthoritiesGrid
          entities={MARKETING_ENTITIES}
          actionLabel="عرض التفاصيل"
          getActionHref={() => '/entities'}
        />
      </section>
    </div>
  )
}
