import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { PLATFORM_STATS } from '@/lib/mock/platform-stats'
import { formatNumber } from '@/lib/utils/format'

const COPY = defineCopy({
  ar: { label: 'واصل بالأرقام' },
  en: { label: 'Wasel at a glance' },
})

/**
 * Product facts as a single ruled strip — four figures divided by hairlines —
 * rather than a heavy panel. Every figure is a verifiable property of the
 * product (see PLATFORM_STATS), never a usage claim.
 */
export async function StatisticsSection() {
  const locale = await getLocale()
  const copy = COPY[locale]

  return (
    <section aria-label={copy.label} className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <Reveal className="border-border grid grid-cols-2 border-y lg:grid-cols-4">
        {PLATFORM_STATS.map((stat, index) => (
          <div
            key={stat.id}
            className={
              // Hairlines between cells: a vertical rule on every cell but the
              // first of each row, and a horizontal one under the first row on
              // the two-column layout.
              [
                'flex flex-col gap-1.5 px-4 py-7 sm:px-6',
                index % 2 === 1 ? 'border-border border-s' : '',
                index >= 2 ? 'border-border max-lg:border-t lg:border-s' : '',
              ].join(' ')
            }
          >
            <p className="text-heading text-3xl leading-none font-semibold tabular-nums sm:text-4xl">
              {stat.display ?? formatNumber(stat.value ?? 0, locale)}
            </p>
            <p className="text-foreground mt-2 text-sm font-medium">{stat.label[locale]}</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {stat.description[locale]}
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
