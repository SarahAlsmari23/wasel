import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { PLATFORM_STATS } from '@/lib/mock/platform-stats'
import { formatNumber } from '@/lib/utils/format'

export function StatisticsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
      {/* The brand's navy panel — the one place the dark artwork belongs. */}
      <div className="bg-wasel-panel text-surface-dark-foreground shadow-lift overflow-hidden rounded-3xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeading
          eyebrow="واصل بالأرقام"
          title="منصة تختصر الطريق إلى الجهة المختصة"
          className="[&_h2]:text-surface-dark-foreground [&_span]:text-accent"
        />

        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_STATS.map((stat, index) => (
            <Reveal key={stat.id} delay={index * 0.07} className="text-center">
              <p className="text-3xl font-semibold sm:text-4xl">
                {formatNumber(stat.value)}
                {stat.suffix ? <span className="text-accent text-2xl">{stat.suffix}</span> : null}
              </p>
              <p className="mt-2 text-sm font-medium">{stat.label}</p>
              <p className="text-surface-dark-foreground/60 mt-1 text-xs leading-relaxed">
                {stat.description}
              </p>
            </Reveal>
          ))}
        </div>

        <p className="text-surface-dark-foreground/50 mt-10 text-center text-xs">
          بيانات توضيحية لعرض واجهة المنصة.
        </p>
      </div>
    </section>
  )
}
