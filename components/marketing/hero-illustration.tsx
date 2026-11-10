import { Landmark, User } from 'lucide-react'
import { Fragment } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { defineCopy, type Locale } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    user: { label: 'أنت', caption: 'تصف مشكلتك' },
    wasal: { label: 'واصل', caption: 'يحلل ويصيغ البلاغ' },
    entity: { label: 'الجهة المختصة', caption: 'تستقبل البلاغ' },
  },
  en: {
    user: { label: 'You', caption: 'Describe your problem' },
    wasal: { label: 'Wasel', caption: 'Analyses and drafts the complaint' },
    entity: { label: 'The authority', caption: 'Receives your complaint' },
  },
})

/** The Wasel node carries the official logo rather than a stand-in glyph. */
const NODES = [
  { key: 'user', icon: User },
  { key: 'wasal', icon: null },
  { key: 'entity', icon: Landmark },
] as const

/**
 * One segment of the journey line. Each segment is its own flex item between
 * two nodes, so it always runs from plate edge to plate edge — whatever the
 * viewport width — instead of being stretched across the whole row from fixed
 * coordinates. The first segment arcs up and the second arcs down, which
 * together read as the original single flowing S-curve.
 *
 * Geometry comes from two custom properties on the row: `--node` (column
 * width) and `--plate` (icon plate size). The negative margin pulls each end
 * from the column edge back to the plate edge, plus 4px so the line tucks
 * behind the plate rather than stopping short of it.
 */
function Connector({ arc }: { arc: 'up' | 'down' }) {
  const d = arc === 'up' ? 'M0 20 C 28 3, 72 3, 100 20' : 'M0 20 C 28 37, 72 37, 100 20'
  return (
    <span
      aria-hidden="true"
      className="animate-fade-in relative mx-[calc((var(--plate)_-_var(--node))/2_-_4px)] h-(--plate) min-w-8 flex-1 [animation-delay:250ms]"
    >
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        fill="none"
        className="text-secondary/45 absolute inset-0 h-full w-full"
      >
        <path
          d={d}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="5 7"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}

/**
 * The journey: You → Wasel → the authority, connected by a continuous line
 * that stays behind the icon plates and never crosses the labels (it only
 * occupies the plates' band). The row follows the reading direction —
 * right-to-left in Arabic, left-to-right in English — and keeps the same
 * three-across composition down to phone widths, where the columns and
 * plates simply get smaller.
 */
export function HeroIllustration({ locale }: { locale: Locale }) {
  const copy = COPY[locale]

  return (
    <ol
      aria-hidden="true"
      className="mx-auto flex w-full max-w-3xl items-start [--node:5.75rem] [--plate:3.5rem] sm:[--node:9.5rem] sm:[--plate:4rem]"
    >
      {NODES.map((node, index) => {
        const Icon = node.icon
        const text = copy[node.key]
        return (
          <Fragment key={node.key}>
            {index > 0 ? <Connector arc={index === 1 ? 'up' : 'down'} /> : null}
            <li
              className="animate-fade-up flex w-(--node) shrink-0 flex-col items-center gap-2 text-center"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {/* White plate keeps the transparent logo artwork crisp in both themes. */}
              <span
                className={
                  Icon === null
                    ? 'border-primary/25 shadow-lift ring-primary/8 relative z-10 flex h-(--plate) w-(--plate) items-center justify-center rounded-2xl border bg-white ring-4'
                    : 'bg-surface border-border text-secondary shadow-soft relative z-10 flex h-(--plate) w-(--plate) items-center justify-center rounded-2xl border'
                }
              >
                {Icon === null ? (
                  <>
                    <WaselLogo variant="mark" size="sm" className="sm:hidden" />
                    <WaselLogo variant="mark" size="md" className="max-sm:hidden" />
                  </>
                ) : (
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </span>
              <span className="text-foreground mt-1 text-sm font-semibold">{text.label}</span>
              <span className="text-muted-foreground text-xs leading-snug">{text.caption}</span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
