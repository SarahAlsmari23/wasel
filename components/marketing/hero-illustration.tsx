'use client'

import { motion, useReducedMotion } from 'motion/react'
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
 * The row follows the reading direction (right-to-left in Arabic,
 * left-to-right in English); on narrow screens it stacks and the connector is
 * hidden. The connector lives strictly within the band of the 64px icon
 * plates, so it never crosses the labels beneath them.
 */
export function HeroIllustration() {
  const copy = useCopy(COPY)
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden="true">
      <svg
        viewBox="0 0 600 64"
        className="text-secondary/40 absolute inset-x-0 top-0 hidden h-16 w-full sm:block"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M132 32 C 190 6, 240 6, 300 32 C 360 58, 410 58, 468 32"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
          vectorEffect="non-scaling-stroke"
          initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
        />
      </svg>

      <div className="relative grid gap-6 sm:grid-cols-3">
        {NODES.map((node, index) => {
          const Icon = node.icon
          const isWasal = node.key === 'wasal'
          const text = copy[node.key]
          return (
            <motion.div
              key={node.key}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 * index, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-2.5 text-center"
            >
              {/* White plate keeps the transparent logo artwork crisp in both themes. */}
              <span
                className={
                  isWasal
                    ? 'border-border shadow-lift flex h-16 w-16 items-center justify-center rounded-2xl border bg-white'
                    : 'bg-surface border-border text-secondary shadow-soft flex h-16 w-16 items-center justify-center rounded-2xl border'
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
