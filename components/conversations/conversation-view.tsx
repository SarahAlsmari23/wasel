'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ConversationStatusBadge } from '@/components/conversations/conversation-status-badge'
import { EntityRecommendationCard } from '@/components/conversations/entity-recommendation-card'
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

  // Persistent side panel shows the most recent recommendation, rather than
  // repeating a card under every message that carried one. The official URL
  // (if any) comes only from a matching RAG source already returned by the
  // API today — never invented.
  const latestEntityRecommendation = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index]
      if (!message.suggestedEntity) continue
      const matchingSource = message.sources?.find(
        (source) => source.entityName === message.suggestedEntity?.name && source.officialUrl,
      )
      return { entity: message.suggestedEntity, officialUrl: matchingSource?.officialUrl }
    }
    return undefined
  }, [messages])

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
          suggestedEntity: payload.suggestedEntity,
          sources: payload.sources,
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-h-[70vh] flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <Link
              href="/conversations"
              className="mb-1 inline-block text-xs font-medium text-gray-600 underline"
            >
              العودة إلى المحادثات
            </Link>
            <h1 className="text-foreground text-xl font-semibold">{conversation.title}</h1>
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
          <div className="bg-danger/5 flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-2">
            <p className="text-danger text-sm">{GENERIC_ERROR_MESSAGE}</p>
            <button
              type="button"
              onClick={() => handleSend(sendError)}
              className="text-danger text-sm font-medium underline"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        <MessageComposer onSend={handleSend} disabled={isAssistantTyping} />
      </div>

      {latestEntityRecommendation ? (
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80">
          <EntityRecommendationCard
            entity={latestEntityRecommendation.entity}
            officialUrl={latestEntityRecommendation.officialUrl}
          />
        </aside>
      ) : null}
    </div>
  )
}
