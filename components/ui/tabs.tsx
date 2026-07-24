type TabItem = {
  value: string
  label: string
}

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
