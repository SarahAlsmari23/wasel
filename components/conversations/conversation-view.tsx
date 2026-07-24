'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ConversationStatusBadge } from '@/components/conversations/conversation-status-badge'
import { MessageBubble } from '@/components/conversations/message-bubble'
import { MessageComposer } from '@/components/conversations/message-composer'
import { TypingIndicator } from '@/components/conversations/typing-indicator'
import { isValidChatSuccessResponse } from '@/lib/ai/contracts'
import type { MockConversation, MockMessage } from '@/types/conversation'
import type { ChatIntent } from '@/types/ai'

const DEFAULT_INTENT: ChatIntent = 'general_question'
const GENERIC_ERROR_MESSAGE = 'تعذر إرسال رسالتك حالياً. حاول مرة أخرى.'
const MAX_HISTORY_ITEMS = 10

type ConversationViewProps = {
  conversation: MockConversation
}

export function ConversationView({ conversation }: ConversationViewProps) {
  const [messages, setMessages] = useState<MockMessage[]>(conversation.messages)
  const [isAssistantTyping, setIsAssistantTyping] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  async function handleSend(content: string) {
    if (isAssistantTyping) return

    const userMessage: MockMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    const recentHistory = messages.slice(-MAX_HISTORY_ITEMS).map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setMessages((prev) => [...prev, userMessage])
    setIsAssistantTyping(true)
    setSendError(null)

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: content,
          history: recentHistory,
          intent: DEFAULT_INTENT,
        }),
        signal: controller.signal,
      })

      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok || !isValidChatSuccessResponse(payload)) {
        throw new Error('chat-request-failed')
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: payload.answer,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      setSendError(content)
    } finally {
      if (abortControllerRef.current === controller) {
        setIsAssistantTyping(false)
        abortControllerRef.current = null
      }
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-4 dark:border-white/10">
        <div>
          <Link
            href="/conversations"
            className="mb-1 inline-block text-xs font-medium text-black/60 underline dark:text-white/60"
          >
            العودة إلى المحادثات
          </Link>
          <h1 className="text-xl font-semibold">{conversation.title}</h1>
        </div>
        <ConversationStatusBadge status={conversation.status} />
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isAssistantTyping ? <TypingIndicator /> : null}
      </div>

      {sendError ? (
        <div className="flex items-center justify-between gap-3 border-t border-black/10 px-4 py-2 dark:border-white/10">
          <p className="text-sm text-red-600">{GENERIC_ERROR_MESSAGE}</p>
          <button
            type="button"
            onClick={() => handleSend(sendError)}
            className="text-sm font-medium underline"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <MessageComposer onSend={handleSend} disabled={isAssistantTyping} />
    </div>
  )
}
