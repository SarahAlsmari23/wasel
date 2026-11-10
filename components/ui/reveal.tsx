import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type RevealProps = {
  children: ReactNode
  className?: string
}

/**
 * Gentle fade-up as the block scrolls into view, driven purely by CSS
 * (`.wasel-reveal`, a scroll-driven animation). Nothing is hidden by script,
 * so content is always visible without JavaScript, in browsers without scroll
 * timelines, and for anyone who prefers reduced motion.
 */
export function Reveal({ children, className = '' }: RevealProps) {
  return <div className={cn('wasel-reveal', className)}>{children}</div>
}
