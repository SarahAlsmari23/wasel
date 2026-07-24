type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-black/10 px-6 py-12 text-center dark:border-white/20">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-black/60 dark:text-white/60">{description}</p>
    </div>
  )
}
