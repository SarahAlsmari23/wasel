import { cn } from '@/lib/utils/cn'

type TabItem = {
  value: string
  label: string
}

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  label?: string
}

export function Tabs({ items, value, onChange, label = 'تصفية' }: TabsProps) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/6 text-muted-foreground hover:bg-primary/10 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
