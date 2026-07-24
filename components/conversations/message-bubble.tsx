import type { MockMessage } from '@/types/conversation'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

type MessageBubbleProps = {
  message: MockMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? 'self-start' : 'self-end'}`}>
      <div
        className={`rounded-2xl px-4 py-2 text-sm ${
          isUser ? 'bg-foreground text-background' : 'bg-black/5 dark:bg-white/10'
        }`}
      >
        {message.content}
      </div>
      <span className="text-xs text-black/40 dark:text-white/40">
        {formatTime(message.createdAt)}
      </span>
    </div>
  )
}
