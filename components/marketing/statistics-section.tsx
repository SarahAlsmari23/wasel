import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { PLATFORM_STATS } from '@/lib/mock/platform-stats'
import { formatNumber } from '@/lib/utils/format'

const COPY = defineCopy({
  ar: { eyebrow: 'واصل بالأرقام', title: 'منصة تختصر الطريق إلى الجهة المختصة' },
  en: { eyebrow: 'Wasel at a glance', title: 'A shorter path to the responsible authority' },
})

export async function StatisticsSection() {
  const locale = await getLocale()
  const copy = COPY[locale]

  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
      {/* The brand's navy panel — the one place the dark artwork belongs. */}
      <div className="bg-wasel-panel text-surface-dark-foreground shadow-lift overflow-hidden rounded-3xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          className="[&_h2]:text-surface-dark-foreground [&_span]:text-[#5fd0b5]"
        />

        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_STATS.map((stat, index) => (
            <Reveal key={stat.id} delay={index * 0.07} className="text-center">
              <p className="text-3xl font-semibold tabular-nums sm:text-4xl" dir="ltr">
                {stat.display ?? formatNumber(stat.value ?? 0, locale)}
              </p>
              <p className="mt-2 text-sm font-medium">{stat.label[locale]}</p>
              <p className="text-surface-dark-foreground/65 mt-1 text-xs leading-relaxed">
                {stat.description[locale]}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
