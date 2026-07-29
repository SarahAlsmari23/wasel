import { Landmark } from 'lucide-react'
import Image from 'next/image'
import { getGovernmentLogo, type GovernmentIconKey } from '@/lib/mock/government-entities'
import { cn } from '@/lib/utils/cn'

/**
 * Container sizes are unchanged from the placeholder version, so no card
 * dimension, spacing or alignment shifts when the official artwork goes in.
 */
const SIZE_CLASSES = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-12 w-12 rounded-2xl',
  lg: 'h-16 w-16 rounded-2xl',
} as const

/** Inset keeps each logo off the container edges so they read as a set. */
const PADDING_CLASSES = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
} as const

const FALLBACK_ICON_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const

type GovernmentLogoProps = {
  iconKey?: GovernmentIconKey
  size?: keyof typeof SIZE_CLASSES
  className?: string
  /**
   * Meaningful Arabic alt text (e.g. "شعار وزارة التجارة"). When omitted
   * (the default), the logo is treated as purely decorative — every call
   * site already shows the entity's name as real text right next to it, so
   * an empty alt + aria-hidden avoids double-announcing the same name to
   * screen readers. Pass this only where the logo itself needs an
   * accessible name of its own.
   */
  alt?: string
}

/**
 * Renders an authority's official logo, resolved from the central
 * GOVERNMENT_LOGOS map — call sites pass an `iconKey`, never a path.
 *
 * The artwork is shown unmodified: transparent PNGs on a white plate, sized
 * with object-contain so nothing is cropped, stretched or recoloured. The plate
 * is white in both themes deliberately — several of these logos use dark navy
 * lettering that would disappear against the dark-mode surface.
 */
export function GovernmentLogo({ iconKey, size = 'md', className = '', alt }: GovernmentLogoProps) {
  const src = getGovernmentLogo(iconKey)
  const isDecorative = !alt

  const container = cn(
    'border-border relative flex shrink-0 items-center justify-center overflow-hidden border bg-white',
    SIZE_CLASSES[size],
    className,
  )

  // An unrecognised key (stale saved data, a renamed sector) must not blank the
  // slot — fall back to the neutral mark rather than a broken image.
  if (!src) {
    return (
      <span
        aria-hidden={isDecorative || undefined}
        className={cn(container, 'text-primary bg-primary/8')}
      >
        <Landmark className={FALLBACK_ICON_CLASSES[size]} />
      </span>
    )
  }

  return (
    <span aria-hidden={isDecorative || undefined} className={container}>
      <Image
        src={src}
        alt={alt ?? ''}
        fill
        sizes="64px"
        className={cn('object-contain', PADDING_CLASSES[size])}
      />
    </span>
  )
}
