import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

const LOGO_SRC = '/brand/wasel-logo.webp'

const SIZE_PX = {
  sm: 28,
  md: 44,
  lg: 88,
  xl: 120,
} as const

type LogoSize = keyof typeof SIZE_PX

/**
 * The supplied asset is a *stacked* lockup — symbol above the wordmark — which
 * only reads well at larger sizes.
 *
 *   full        the official lockup, unmodified. Use in centred, roomy places.
 *   horizontal  symbol beside a typeset wordmark, matching the horizontal
 *               lockup on the identity sheet. Use in bars, where a stacked
 *               lockup would shrink its wordmark to an illegible smudge.
 *   mark        symbol only, for tight spots such as chat avatars.
 */
type LogoVariant = 'full' | 'horizontal' | 'mark'

type WaselLogoProps = {
  size?: LogoSize
  variant?: LogoVariant
  className?: string
  priority?: boolean
}

/** The symbol occupies roughly the top 62% of the artwork. */
const MARK_ZOOM = 1.62

function Mark({ px, priority }: { px: number; priority: boolean }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {/* Scaling from the top edge zooms past the wordmark, leaving the symbol. */}
      <Image
        src={LOGO_SRC}
        alt=""
        fill
        sizes={`${px}px`}
        className="origin-top object-contain object-top"
        style={{ transform: `scale(${MARK_ZOOM})` }}
        priority={priority}
      />
    </span>
  )
}

export function WaselLogo({
  size = 'md',
  variant = 'full',
  className = '',
  priority = false,
}: WaselLogoProps) {
  const px = SIZE_PX[size]

  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex', className)}>
        <Mark px={px} priority={priority} />
      </span>
    )
  }

  if (variant === 'horizontal') {
    return (
      <span className={cn('inline-flex items-center gap-2.5', className)}>
        <Mark px={px} priority={priority} />
        <span
          className={cn(
            'font-arabic text-heading font-bold tracking-tight',
            size === 'sm' ? 'text-lg' : 'text-2xl',
          )}
        >
          واصل
        </span>
      </span>
    )
  }

  return (
    <Image
      src={LOGO_SRC}
      alt="واصل"
      width={px}
      height={px}
      sizes={`${px}px`}
      priority={priority}
      className={cn('w-auto shrink-0 object-contain', className)}
      style={{ height: px }}
    />
  )
}
