'use client'

import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils/cn'

const AUTO_DISMISS_MS = 4000

export type ToastTone = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Feedback toasts are used from every phase (save complaint, copy summary,
 * profile updated, login required…), so the provider wraps the whole app.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, tone }])
      timersRef.current.set(
        id,
        window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS),
      )
    },
    [dismissToast],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

/**
 * Returns a no-op instead of throwing when no provider is mounted. A missing
 * toast host is a cosmetic problem — it must never be the reason a dashboard
 * page fails to render, which is what a thrown error here would cause.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    return NOOP_TOAST_CONTEXT
  }
  return context
}

const NOOP_TOAST_CONTEXT: ToastContextValue = {
  showToast: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[wasal] useToast called outside <ToastProvider>; dropped:', message)
    }
  },
}

const TONE_STYLES: Record<ToastTone, { className: string; icon: typeof CheckCircle2 }> = {
  success: { className: 'border-status-completed/30 text-status-completed', icon: CheckCircle2 },
  error: { className: 'border-danger/30 text-danger', icon: AlertTriangle },
  info: { className: 'border-secondary/30 text-secondary', icon: Info },
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      role="region"
      aria-label="إشعارات"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:items-start sm:px-0"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { className, icon: Icon } = TONE_STYLES[toast.tone]
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              aria-live="polite"
              className={cn(
                'bg-surface shadow-lift pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3',
                className,
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-foreground flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="إغلاق الإشعار"
                className="text-muted-foreground hover:text-foreground -mt-0.5 rounded p-0.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
