'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils/cn'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Escape to close, Tab cycles within the panel, and the page behind the
  // overlay stays put instead of scrolling under it.
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    }, 0)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  // `document` is unavailable during the server render, so the portal only
  // mounts once the component is running in the browser.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#12355B]/35 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'bg-surface border-border shadow-lift relative w-full max-w-md rounded-t-3xl border p-6 sm:rounded-3xl',
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="text-muted-foreground hover:bg-primary/6 hover:text-foreground absolute top-4 left-4 rounded-lg p-1.5 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <h2 id={titleId} className="text-heading pl-8 text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {description}
              </p>
            ) : null}

            {children ? <div className="mt-5">{children}</div> : null}
            {footer ? <div className="mt-6 flex flex-col gap-2 sm:flex-row">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
