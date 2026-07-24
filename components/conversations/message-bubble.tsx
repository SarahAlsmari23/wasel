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
        className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground'
        }`}
      >
        {message.content}
      </div>
      <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
    </div>
  )
}
