import { cn } from '@/lib/utils/cn'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  /**
   * `split` (default) — eyebrow and title at the start, description beside
   * them on wide screens: the editorial layout used by every content section.
   * `center` — stacked and centred, for page-level introductions.
   */
  align?: 'split' | 'center'
  className?: string
  /** Use `h1` when the heading is the page's main title. */
  as?: 'h1' | 'h2'
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'split',
  className = '',
  as: Heading = 'h2',
}: SectionHeadingProps) {
  if (align === 'center') {
    return (
      <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <Heading className="text-heading text-2xl font-semibold text-balance sm:text-3xl">
          {title}
        </Heading>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-12',
        className,
      )}
    >
      <div className="flex flex-col items-start gap-3">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <Heading className="text-heading text-2xl leading-tight font-semibold text-balance sm:text-[2rem]">
          {title}
        </Heading>
      </div>
      {description ? (
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed text-pretty sm:text-base lg:justify-self-end">
          {description}
        </p>
      ) : null}
    </div>
  )
}
