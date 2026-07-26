import { cn } from '@/lib/utils/cn'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: 'start' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start text-start',
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-secondary text-xs font-semibold tracking-wide">{eyebrow}</span>
      ) : null}
      <h2 className="text-heading text-2xl font-semibold text-balance sm:text-3xl">{title}</h2>
      {description ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  )
}
