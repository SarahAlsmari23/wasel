import { Building2, FolderClock, MessageSquareText, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

type QuickAction = {
  href: string
  label: string
  description: string
  icon: typeof SquarePen
  prominent?: boolean
}

const BASE_ACTIONS: QuickAction[] = [
  {
    href: '/wasal?mode=complaint',
    label: 'بلاغ جديد',
    description: 'ابدأ إعداد بلاغ مع واصل.',
    icon: SquarePen,
    prominent: true,
  },
  {
    href: '/wasal?mode=assistant',
    label: 'اسأل واصل',
    description: 'اطرح سؤالاً عاماً.',
    icon: MessageSquareText,
  },
  {
    href: '/entities',
    label: 'الجهات الحكومية',
    description: 'تصفّح الجهات المدعومة.',
    icon: Building2,
  },
]

type QuickActionsProps = {
  /** Points at the most recent draft; omitted when the user has none. */
  continueDraftHref?: string
}

export function QuickActions({ continueDraftHref }: QuickActionsProps) {
  const actions: QuickAction[] = continueDraftHref
    ? [
        BASE_ACTIONS[0],
        {
          href: continueDraftHref,
          label: 'متابعة مسودة',
          description: 'أكمل آخر بلاغ غير مكتمل.',
          icon: FolderClock,
        },
        ...BASE_ACTIONS.slice(1),
      ]
    : BASE_ACTIONS

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-sm font-semibold">إجراءات سريعة</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                'shadow-soft hover:shadow-lift group flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5',
                action.prominent
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-surface border-border',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  action.prominent
                    ? 'bg-primary-foreground/12 text-primary-foreground'
                    : 'bg-secondary/12 text-secondary',
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p
                  className={cn(
                    'mt-0.5 text-xs leading-relaxed',
                    action.prominent ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {action.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
