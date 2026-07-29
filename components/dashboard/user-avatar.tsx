import { cn } from '@/lib/utils/cn'

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-xs',
  lg: 'h-20 w-20 text-2xl',
} as const

/** First letters of the first two words, e.g. "جمانة الحربي" → "جح". */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '؟'
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}

type UserAvatarProps = {
  name: string
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function UserAvatar({ name, size = 'sm', className = '' }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  )
}
