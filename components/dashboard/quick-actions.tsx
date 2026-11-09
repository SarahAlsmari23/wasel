'use client'

import { Building2, FolderClock, MessageSquareText, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/components/i18n/locale-provider'
import type { Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

type QuickAction = {
  href: string
  label: Record<Locale, string>
  description: Record<Locale, string>
  icon: typeof SquarePen
  prominent?: boolean
}

const NEW_COMPLAINT: QuickAction = {
  href: '/wasal?mode=complaint',
  label: { ar: 'بلاغ جديد', en: 'New complaint' },
  description: { ar: 'ابدأ إعداد بلاغ مع واصل.', en: 'Start preparing a complaint with Wasel.' },
  icon: SquarePen,
  prominent: true,
}

const OTHER_ACTIONS: QuickAction[] = [
  {
    href: '/wasal?mode=assistant',
    label: { ar: 'اسأل واصل', en: 'Ask Wasel' },
    description: { ar: 'اطرح سؤالاً عاماً.', en: 'Ask a general question.' },
    icon: MessageSquareText,
  },
  {
    href: '/entities',
    label: { ar: 'الجهات الحكومية', en: 'Government authorities' },
    description: { ar: 'تصفّح الجهات المدعومة.', en: 'Browse the supported authorities.' },
    icon: Building2,
  },
]

const HEADING = { ar: 'إجراءات سريعة', en: 'Quick actions' } as const

type QuickActionsProps = {
  /** Points at the most recent draft; omitted when the user has none. */
  continueDraftHref?: string
}

export function QuickActions({ continueDraftHref }: QuickActionsProps) {
  const locale = useLocale()
  const actions: QuickAction[] = continueDraftHref
    ? [
        NEW_COMPLAINT,
        {
          href: continueDraftHref,
          label: { ar: 'متابعة مسودة', en: 'Continue a draft' },
          description: {
            ar: 'أكمل آخر بلاغ غير مكتمل.',
            en: 'Finish your latest incomplete complaint.',
          },
          icon: FolderClock,
        },
        ...OTHER_ACTIONS,
      ]
    : [NEW_COMPLAINT, ...OTHER_ACTIONS]

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-sm font-semibold">{HEADING[locale]}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                'shadow-soft hover:shadow-lift group flex flex-col gap-3 rounded-2xl border p-5 transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5',
                action.prominent
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-surface border-border hover:border-border-strong',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  action.prominent
                    ? 'bg-primary-foreground/12 text-primary-foreground'
                    : 'bg-surface-tint text-primary',
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{action.label[locale]}</p>
                <p
                  className={cn(
                    'mt-0.5 text-xs leading-relaxed',
                    action.prominent ? 'text-primary-foreground/75' : 'text-muted-foreground',
                  )}
                >
                  {action.description[locale]}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
