'use client'

import { motion } from 'motion/react'
import { Landmark, User } from 'lucide-react'
import { WaselLogo } from '@/components/brand/wasel-logo'

/** The Wasel node carries the official logo rather than a stand-in glyph. */
const NODES = [
  { key: 'user', label: 'أنت', caption: 'تصف مشكلتك', icon: User },
  { key: 'wasal', label: 'واصل', caption: 'يحلل ويصيغ البلاغ', icon: null },
  { key: 'entity', label: 'الجهة المختصة', caption: 'تستقبل البلاغ', icon: Landmark },
] as const

/**
 * Clean line illustration of the journey: You → Wasal → the authority.
 * RTL, so the flow reads from the right node to the left one; on narrow
 * screens the row stacks and the connector is hidden.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden="true">
      <svg
        viewBox="0 0 600 120"
        className="text-secondary/45 absolute inset-x-0 top-9 hidden h-24 w-full sm:block"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M110 60 C 190 10, 230 10, 300 60 C 370 110, 410 110, 490 60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.4 }}
        />
      </svg>

      <div className="relative grid gap-6 sm:grid-cols-3">
        {NODES.map((node, index) => {
          const Icon = node.icon
          const isWasal = node.key === 'wasal'
          return (
            <motion.div
              key={node.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * index, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-2.5 text-center"
            >
              {/*
                Same 64px plate, radius, position and shadow as before. Only the
                fill changed: the logo is transparent artwork in the brand green
                and navy, so it would have been invisible on the previous solid
                green plate. White keeps it crisp here and in dark mode, and
                matches how official logos are plated elsewhere in the product.
              */}
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
              <span className="text-foreground text-sm font-semibold">{node.label}</span>
              <span className="text-muted-foreground text-xs">{node.caption}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
