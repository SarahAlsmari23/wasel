'use client'

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderClock,
  MessageSquareText,
  SquarePen,
} from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/components/i18n/locale-provider'
import type { Locale } from '@/lib/i18n/config'

type QuickAction = {
  href: string
  label: Record<Locale, string>
  description: Record<Locale, string>
  icon: typeof SquarePen
}

const NEW_COMPLAINT: QuickAction = {
  href: '/wasal?mode=complaint',
  label: { ar: 'بلاغ جديد', en: 'New complaint' },
  description: { ar: 'ابدأ إعداد بلاغ مع واصل.', en: 'Start preparing a complaint with Wasel.' },
  icon: SquarePen,
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

/** A compact list of shortcuts — rows, not tiles — for the overview's side column. */
export function QuickActions({ continueDraftHref }: QuickActionsProps) {
  const locale = useLocale()
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight
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

      <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-2xl border">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="group hover:bg-primary/4 flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-200"
              >
                <span className="bg-surface-tint text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-heading block text-sm font-medium">
                    {action.label[locale]}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {action.description[locale]}
                  </span>
                </span>
                <Chevron
                  className="text-subtle-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
