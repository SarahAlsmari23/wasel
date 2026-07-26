'use client'

import { motion, useReducedMotion } from 'motion/react'
import { FileSignature, MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { cn } from '@/lib/utils/cn'
import { useMediaQuery } from '@/lib/utils/use-media-query'

/**
 * Step 02 is Wasel doing the work, so it carries the official logo mark rather
 * than a stand-in glyph.
 */
const STEPS = [
  {
    number: '01',
    icon: MessageSquareText,
    title: 'صف مشكلتك',
    description: 'ابدأ محادثة طبيعية مع واصل واشرح المشكلة كما لو كنت تتحدث مع شخص يساعدك.',
  },
  {
    number: '02',
    icon: null,
    title: 'واصل يحلل الحالة',
    description:
      'يقوم واصل بتحليل المشكلة وتحديد الجهة الحكومية المناسبة مع اقتراح أفضل طريقة لمعالجة البلاغ.',
  },
  {
    number: '03',
    icon: FileSignature,
    title: 'أنشئ البلاغ',
    description: 'بعد التأكد من الجهة المناسبة يمكنك تسجيل الدخول وإنشاء البلاغ خلال ثوانٍ.',
  },
]

/** Resting fan: each card sits a little further back and a little more rotated. */
const BASE_ROTATION = [-1.5, 2.5, 6]
const BASE_LIFT = [0, 12, 24]
const BASE_SCALE = [1, 0.965, 0.93]

/**
 * Horizontal offset between cards, in pixels. Tablet keeps the depth but
 * overlaps less, so all three stay comfortably readable on a narrower canvas.
 */
const DECK_STEP = 244
const COMPACT_STEP = 176

/** 250–350ms, settled with a gentle spring rather than a linear ease. */
const SPRING = { type: 'spring', duration: 0.32, bounce: 0.18 } as const

type CardGeometry = {
  rotate: number
  y: number
  scale: number
  zIndex: number
}

function getGeometry(index: number, activeIndex: number | null, isStacked: boolean): CardGeometry {
  if (isStacked) {
    // Mobile: a plain vertical list. Tapping still highlights the card, but
    // there is no overlap to unstack.
    const isActive = activeIndex === index
    return {
      rotate: 0,
      y: 0,
      scale: isActive ? 1.02 : 1,
      zIndex: isActive ? 40 : 10,
    }
  }

  const base: CardGeometry = {
    rotate: BASE_ROTATION[index],
    y: BASE_LIFT[index],
    scale: BASE_SCALE[index],
    zIndex: 30 - index * 10,
  }

  if (activeIndex === null) return base

  // The hovered card straightens and comes forward…
  if (activeIndex === index) {
    return { rotate: 0, y: -10, scale: 1.03, zIndex: 40 }
  }

  // …while the rest settle a little further back.
  return {
    rotate: base.rotate,
    y: base.y + 10,
    scale: base.scale - 0.03,
    zIndex: base.zIndex,
  }
}

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // The server snapshot is `false`, so the mobile stack is the safe default and
  // the deck engages once the real viewport is known. The section sits well
  // below the fold, so the swap is never observed in practice.
  const isDeck = useMediaQuery('(min-width: 1024px)')
  const isCompact = useMediaQuery('(min-width: 640px) and (max-width: 1023.98px)')
  const isStacked = !isDeck && !isCompact

  const step = isDeck ? DECK_STEP : COMPACT_STEP
  const cardWidth = isDeck ? 336 : 288
  const deckWidth = step * (STEPS.length - 1) + cardWidth

  return (
    <div
      className={cn(
        'mx-auto',
        // Taller than a card: the fan's rotation and downward offset push the
        // back cards past the card height, and the container has to contain
        // them or they collide with the next section.
        isStacked ? 'flex w-full flex-col gap-4' : 'relative h-[26rem]',
      )}
      style={isStacked ? undefined : { width: deckWidth, maxWidth: '100%' }}
      onMouseLeave={() => setActiveIndex(null)}
    >
      {STEPS.map((stepItem, index) => {
        const Icon = stepItem.icon
        const geometry = getGeometry(index, activeIndex, isStacked)
        const isActive = activeIndex === index

        return (
          <motion.div
            key={stepItem.number}
            // No entrance animation: the resting fan is the initial state, so
            // nothing lurches into place when the section scrolls into view.
            initial={false}
            animate={
              prefersReducedMotion
                ? { zIndex: geometry.zIndex }
                : {
                    rotate: geometry.rotate,
                    y: geometry.y,
                    scale: geometry.scale,
                    zIndex: geometry.zIndex,
                  }
            }
            transition={SPRING}
            style={
              isStacked
                ? { zIndex: geometry.zIndex }
                : {
                    position: 'absolute',
                    insetInlineStart: index * step,
                    top: 0,
                    width: cardWidth,
                    // Rotate around the bottom edge so the fan pivots like a
                    // real deck rather than spinning about its middle.
                    transformOrigin: 'bottom center',
                  }
            }
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            onClick={() => setActiveIndex((current) => (current === index ? null : index))}
            tabIndex={0}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'border-border bg-surface cursor-default rounded-3xl border p-7 transition-shadow duration-300 outline-none sm:p-8',
              isActive ? 'shadow-lift' : 'shadow-soft',
              isStacked ? 'w-full' : 'h-[22rem]',
            )}
          >
            <div className="flex h-full flex-col">
              {/*
                Icon at the start, number at the end. The deck fans leftwards in
                RTL, so the end of each card is the sliver that stays visible —
                keeping the numbers there means 01 / 02 / 03 all read at a
                glance even while stacked.
              */}
              <div className="flex items-start justify-between gap-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300',
                    Icon === null
                      ? 'bg-surface-tint'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/12 text-secondary',
                  )}
                >
                  {Icon === null ? (
                    <WaselLogo size="sm" variant="mark" />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    'text-5xl leading-none font-semibold tracking-tight transition-colors duration-300 sm:text-6xl',
                    isActive ? 'text-primary/30' : 'text-primary/15',
                  )}
                  dir="ltr"
                >
                  {stepItem.number}
                </span>
              </div>

              <div className="mt-auto flex flex-col gap-2.5 pt-8">
                <h4 className="text-heading text-lg font-semibold sm:text-xl">
                  <span className="sr-only">الخطوة {stepItem.number}: </span>
                  {stepItem.title}
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                  {stepItem.description}
                </p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
