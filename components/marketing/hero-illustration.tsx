'use client'

import { motion } from 'motion/react'
import { Landmark, User } from 'lucide-react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'

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
 * Clean line illustration of the journey: You → Wasel → the authority.
 * The flow follows the reading direction (right-to-left in Arabic,
 * left-to-right in English).
 *
 * The connecting curve
 * --------------------
 * The SVG spans exactly from the centre of the first column to the centre of
 * the last one — `inset-x` is the grid's own column-centre formula, so it
 * holds at every width — and its vertical middle sits on the plates' centre
 * line (`-top-4` + `h-24` centres a 96px box on the 64px plate). The middle
 * node therefore lands on x = 50% and both ends sit at the outer nodes'
 * centres, tucked behind their plates (the plates paint above the line), so
 * every segment visibly runs plate edge to plate edge with no gap.
 *
 * The curve keeps the original shape (one arc up, one arc down, with the
 * original control-point proportions and ±40px amplitude), colour and 1.5px
 * stroke; `non-scaling-stroke` keeps the stroke crisp although the box is
 * stretched horizontally. In English the SVG is mirrored so the arcs keep the
 * same relationship to "You" and "the authority" as in Arabic.
 *
 * The draw-in runs in CSS (a clip that opens from the "You" end), so the line
 * never depends on hydration and always finishes complete; with reduced
 * motion it is simply shown.
 *
 * Below `sm` the row stacks; a short vertical rule in the same style joins
 * each node to the next one.
 */
export function HeroIllustration() {
  const copy = useCopy(COPY)

  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden="true">
      {/*
        The wrapper carries the geometry: an <svg> is a replaced element, so
        left + right alone would not stretch it past its intrinsic width.
      */}
      <span className="absolute inset-x-[calc((100%_-_3rem)/6)] -top-4 hidden h-24 sm:block">
        <svg
          viewBox="0 0 400 96"
          className="wasel-journey-line text-secondary/45 block h-full w-full ltr:-scale-x-100"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 48 C 84 8, 126 8, 200 48 C 274 88, 316 88, 400 48"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>

      <div className="relative grid gap-6 sm:grid-cols-3">
        {NODES.map((node, index) => {
          const Icon = node.icon
          const isWasal = node.key === 'wasal'
          const text = copy[node.key]
          const isLast = index === NODES.length - 1
          return (
            <motion.div
              key={node.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * index, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center gap-2.5 text-center"
            >
              {/* Phones: the same line, running down to the next node's plate. */}
              {!isLast ? (
                <span className="border-secondary/45 absolute top-full left-1/2 h-[calc(1.5rem+2rem)] border-s-[1.5px] sm:hidden" />
              ) : null}
              <span
                className={
                  isWasal
                    ? 'border-border shadow-lift relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-white'
                    : 'bg-surface border-border text-secondary shadow-soft relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border'
                }
              >
                {Icon === null ? (
                  <WaselLogo variant="mark" size="md" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </span>
              <span className="text-foreground text-sm font-semibold">{text.label}</span>
              <span className="text-muted-foreground text-xs">{text.caption}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
