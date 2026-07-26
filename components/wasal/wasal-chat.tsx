'use client'

import { AnimatePresence } from 'motion/react'
import { FileSignature, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AuthorityModal } from '@/components/wasal/authority-modal'
import { ChatComposer, type PendingAttachment } from '@/components/wasal/chat-composer'
import { ChatEmptyState, CHAT_GREETING } from '@/components/wasal/chat-empty-state'
import { ChatMessage } from '@/components/wasal/chat-message'
import { LoginRequiredModal } from '@/components/wasal/login-required-modal'
import { ProgressTimeline } from '@/components/wasal/progress-timeline'
import { RecommendationCard } from '@/components/wasal/recommendation-card'
import { RecommendationSkeleton } from '@/components/wasal/recommendation-skeleton'
import { SaveComplaintModal } from '@/components/wasal/save-complaint-modal'
import { TypingIndicator } from '@/components/wasal/typing-indicator'
import { getGovernmentEntityByName, type GovernmentEntity } from '@/lib/mock/government-entities'
import { requestAssistantAnswer } from '@/lib/wasal/chat-client'
import { COMPLAINT_CTA_MESSAGE, wantsToCreateComplaint } from '@/lib/wasal/complaint-intent'
import {
  clearConversation,
  loadConversation,
  saveConversation,
} from '@/lib/wasal/conversation-storage'
import { matchEntity } from '@/lib/wasal/entity-matching'
import {
  buildComplaintAnalysis,
  buildComplaintLetter,
  buildComplaintTitle,
  COMPLAINT_INTRO,
  COMPLAINT_STEPS,
  type ComplaintAnswers,
} from '@/lib/wasal/mock-engine'
import type { ComplaintStatus } from '@/types/complaint'
import type { MockMessage } from '@/types/conversation'
import type { ComplaintAnalysis, WasalMode } from '@/types/wasal'

const MAX_HISTORY_ITEMS = 10
const THINKING_DELAY_MS = 700
const ANALYSIS_DELAY_MS = 1800

type ChatStatus = 'idle' | 'thinking' | 'analyzing'

function createMessage(
  role: MockMessage['role'],
  content: string,
  extra?: Partial<Pick<MockMessage, 'attachment' | 'cta'>>,
): MockMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extra,
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** The first complaint-builder prompt, appended to the ongoing conversation. */
function buildComplaintOpeningMessage(): MockMessage {
  const firstStep = COMPLAINT_STEPS[0]
  const question = firstStep.hint
    ? `${firstStep.question}\n\n_${firstStep.hint}_`
    : firstStep.question
  return createMessage('assistant', `${COMPLAINT_INTRO}\n\n${question}`)
}

type WasalChatProps = {
  isAuthenticated: boolean
  /** `?mode=complaint` resumes the builder after sign-in, or opens it directly. */
  initialMode?: WasalMode
}

export function WasalChat({ isAuthenticated, initialMode }: WasalChatProps) {
  const router = useRouter()
  const { showToast } = useToast()

  // 'assistant' is the default and only entry point — there is no mode picker.
  // 'complaint' is entered later, from the conversation itself.
  const [mode, setMode] = useState<WasalMode>('assistant')
  const [messages, setMessages] = useState<MockMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [failedMessage, setFailedMessage] = useState<string | null>(null)

  const [complaintAnswers, setComplaintAnswers] = useState<ComplaintAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null)

  const [authorityEntity, setAuthorityEntity] = useState<GovernmentEntity | null>(null)
  const [authorityReason, setAuthorityReason] = useState<string | undefined>(undefined)
  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false)
  const [announcedEntities, setAnnouncedEntities] = useState<string[]>([])

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [hasRestored, setHasRestored] = useState(false)

  const conversationIdRef = useRef(crypto.randomUUID())
  const abortRef = useRef<AbortController | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  /** Mirrors `announcedEntities` for synchronous reads during a turn. */
  const announcedEntitiesRef = useRef<string[]>([])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status, analysis])

  const startComplaintBuilder = useCallback((existing: MockMessage[]) => {
    // The builder continues the same thread rather than replacing it, so the
    // user keeps everything they already told Wasal in view.
    setMode('complaint')
    setStepIndex(0)
    setComplaintAnswers({})
    setAnalysis(null)
    setIsSaved(false)
    setMessages([...existing, buildComplaintOpeningMessage()])
  }, [])

  /**
   * Restores the conversation on mount and, when the user has just come back
   * from signing in, continues straight into the complaint builder.
   */
  useEffect(() => {
    const stored = loadConversation()
    const wantsComplaint = initialMode === 'complaint'

    if (stored) {
      conversationIdRef.current = stored.conversationId
      setMessages(stored.messages)
      setComplaintAnswers(stored.complaintAnswers ?? {})
      setStepIndex(stored.stepIndex ?? 0)
      setAnalysis(stored.analysis ?? null)
      announcedEntitiesRef.current = stored.announcedEntities ?? []
      setAnnouncedEntities(announcedEntitiesRef.current)
      if (stored.analysis || (stored.stepIndex ?? 0) > 0 || stored.pendingComplaint) {
        setMode('complaint')
      }
    }

    if (wantsComplaint) {
      if (isAuthenticated) {
        startComplaintBuilder(stored?.messages ?? [])
        showToast('تم تسجيل الدخول — لنكمل إعداد بلاغك.', 'success')
      } else {
        // Arrived with the intent but still a guest (e.g. a shared link).
        setIsLoginModalOpen(true)
      }
      router.replace('/wasal', { scroll: false })
    }

    setHasRestored(true)
    // Runs once, for whatever state the page was loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mirror the conversation into sessionStorage so signing in never loses it.
  useEffect(() => {
    if (!hasRestored) return
    if (messages.length === 0) return

    saveConversation({
      conversationId: conversationIdRef.current,
      messages,
      complaintAnswers,
      stepIndex,
      analysis,
      announcedEntities,
      pendingComplaint: mode === 'complaint',
    })
  }, [hasRestored, messages, complaintAnswers, stepIndex, analysis, announcedEntities, mode])

  /** Offers the complaint flow, gating on auth only at this point. */
  const requestComplaintCreation = useCallback(() => {
    setIsAuthorityModalOpen(false)

    if (!isAuthenticated) {
      // Persist immediately: the sign-in navigation unmounts this component.
      saveConversation({
        conversationId: conversationIdRef.current,
        messages,
        complaintAnswers,
        stepIndex,
        analysis,
        announcedEntities,
        pendingComplaint: true,
      })
      setIsLoginModalOpen(true)
      return
    }

    startComplaintBuilder(messages)
  }, [
    isAuthenticated,
    messages,
    complaintAnswers,
    stepIndex,
    analysis,
    announcedEntities,
    startComplaintBuilder,
  ])

  /**
   * Surfaces the authority modal the first time a given entity is identified.
   * Re-identifying the same entity later does not interrupt the user again.
   */
  const announceEntity = useCallback((entityName: string | undefined, reason?: string) => {
    if (!entityName) return
    const entity = getGovernmentEntityByName(entityName)
    if (!entity) return
    // Read through a ref rather than inside a state updater: updaters must stay
    // pure, and React may invoke them twice in development.
    if (announcedEntitiesRef.current.includes(entity.id)) return

    announcedEntitiesRef.current = [...announcedEntitiesRef.current, entity.id]
    setAnnouncedEntities(announcedEntitiesRef.current)
    setAuthorityEntity(entity)
    setAuthorityReason(reason)
    setIsAuthorityModalOpen(true)
  }, [])

  async function runAssistantTurn(content: string, controller: AbortController) {
    setStatus('thinking')
    const history = messages.slice(-MAX_HISTORY_ITEMS).map((message) => ({
      role: message.role,
      content: message.content,
    }))

    try {
      const result = await requestAssistantAnswer({
        conversationId: conversationIdRef.current,
        message: content,
        history,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return

      setMessages((previous) => [...previous, createMessage('assistant', result.answer)])

      // Prefer the entity the assistant itself identified. When the response
      // carries none, fall back to the existing keyword matcher rather than
      // adding any new inference — same helper the mocked engine already uses.
      const entityName = result.suggestedEntityName ?? matchEntity(content)?.entity.name
      announceEntity(entityName, result.suggestedEntityReason)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFailedMessage(content)
    } finally {
      if (abortRef.current === controller) {
        setStatus('idle')
        abortRef.current = null
      }
    }
  }

  async function runComplaintTurn(content: string, controller: AbortController) {
    const step = COMPLAINT_STEPS[stepIndex]
    const nextAnswers: ComplaintAnswers = { ...complaintAnswers, [step.key]: content }
    setComplaintAnswers(nextAnswers)

    const nextIndex = stepIndex + 1
    const isLastStep = nextIndex >= COMPLAINT_STEPS.length

    try {
      if (!isLastStep) {
        setStatus('thinking')
        await delay(THINKING_DELAY_MS, controller.signal)

        const nextStep = COMPLAINT_STEPS[nextIndex]
        const question = nextStep.hint
          ? `${nextStep.question}\n\n_${nextStep.hint}_`
          : nextStep.question

        setMessages((previous) => [...previous, createMessage('assistant', question)])
        setStepIndex(nextIndex)
        return
      }

      setStatus('analyzing')
      await delay(ANALYSIS_DELAY_MS, controller.signal)

      const result = buildComplaintAnalysis(nextAnswers)
      setAnalysis(result)
      setMessages((previous) => [
        ...previous,
        createMessage(
          'assistant',
          `اكتمل التحليل ✅

الجهة المختصة بشكواك هي **${result.entityName}**، ضمن تصنيف **${result.category}**.

جهّزت لك ملخص البلاغ والمستندات المطلوبة وخطوات التقديم في **بطاقة الجهة المختصة**. يمكنك حفظ البلاغ، أو نسخ الملخص، أو الانتقال مباشرة إلى الموقع الرسمي للجهة.`,
        ),
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFailedMessage(content)
    } finally {
      if (abortRef.current === controller) {
        setStatus('idle')
        abortRef.current = null
      }
    }
  }

  /**
   * The user asked Wasal to write the complaint. Answer in the thread with an
   * inline call to action instead of silently switching modes on them.
   */
  async function offerComplaintInline(controller: AbortController) {
    try {
      setStatus('thinking')
      await delay(THINKING_DELAY_MS, controller.signal)
      setMessages((previous) => [
        ...previous,
        createMessage('assistant', COMPLAINT_CTA_MESSAGE, { cta: 'create_complaint' }),
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    } finally {
      if (abortRef.current === controller) {
        setStatus('idle')
        abortRef.current = null
      }
    }
  }

  async function handleSend(rawContent?: string) {
    const content = (rawContent ?? inputValue).trim()
    if (content === '' || status !== 'idle') return

    setFailedMessage(null)
    setMessages((previous) => [
      ...previous,
      createMessage('user', content, { attachment: attachment ?? undefined }),
    ])
    setInputValue('')
    setAttachment(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (mode === 'complaint') {
      await runComplaintTurn(content, controller)
      return
    }

    if (wantsToCreateComplaint(content)) {
      await offerComplaintInline(controller)
      return
    }

    await runAssistantTurn(content, controller)
  }

  function handleRetry() {
    const content = failedMessage
    if (!content) return
    setFailedMessage(null)
    // Drop the user bubble that failed, then resend it as a fresh turn.
    setMessages((previous) => {
      const lastUserIndex = previous.findLastIndex((message) => message.role === 'user')
      return lastUserIndex === -1 ? previous : previous.slice(0, lastUserIndex)
    })
    void handleSend(content)
  }

  function handleNewConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    conversationIdRef.current = crypto.randomUUID()
    clearConversation()

    setMode('assistant')
    setMessages([])
    setInputValue('')
    setAttachment(null)
    setStatus('idle')
    setFailedMessage(null)
    setComplaintAnswers({})
    setStepIndex(0)
    setAnalysis(null)
    announcedEntitiesRef.current = []
    setAnnouncedEntities([])
    setAuthorityEntity(null)
    setIsAuthorityModalOpen(false)
  }

  function handleSaveComplaint(title: string, complaintStatus: ComplaintStatus) {
    setIsSaving(true)
    // No persistence in this phase — the save is acknowledged in the UI only.
    window.setTimeout(() => {
      setIsSaving(false)
      setIsSaved(true)
      setIsSaveModalOpen(false)
      showToast(
        complaintStatus === 'draft' ? 'تم حفظ البلاغ كمسودة.' : 'تم حفظ البلاغ وهو جاهز للتقديم.',
      )
    }, 600)
  }

  const isComplaintMode = mode === 'complaint'
  const isEmpty = messages.length === 0
  const letter = analysis ? buildComplaintLetter(complaintAnswers, analysis) : ''
  const isComposerDisabled = status !== 'idle' || (isComplaintMode && analysis !== null)

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Nothing to act on before the first message — keep the blank slate clean. */}
        {isEmpty ? null : (
          <div className="border-border bg-background/85 flex items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur-lg sm:px-6">
            <div className="flex items-center gap-2">
              {isComplaintMode ? (
                <span className="bg-primary/8 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
                  <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
                  جارٍ إعداد البلاغ
                </span>
              ) : (
                <span className="text-muted-foreground text-sm font-medium">واصل</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isComplaintMode ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={requestComplaintCreation}
                  className="hidden sm:inline-flex"
                >
                  <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
                  إنشاء بلاغ
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNewConversation}
                aria-label="بدء محادثة جديدة"
                title="بدء محادثة جديدة"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">محادثة جديدة</span>
              </Button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {isEmpty && status === 'idle' ? (
              <ChatEmptyState onSelectSuggestion={(suggestion) => setInputValue(suggestion)} />
            ) : null}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCreateComplaint={requestComplaintCreation}
              />
            ))}

            <AnimatePresence>
              {status !== 'idle' ? (
                <TypingIndicator
                  key="typing"
                  label={status === 'analyzing' ? 'واصل يحلل الشكوى...' : 'واصل يكتب...'}
                />
              ) : null}
            </AnimatePresence>

            {failedMessage ? (
              <div className="border-danger/25 bg-danger/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
                <p className="text-danger text-sm">
                  {isComplaintMode
                    ? 'تعذر تحليل الشكوى. يرجى المحاولة مرة أخرى.'
                    : 'تعذر إرسال رسالتك حالياً. حاول مرة أخرى.'}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {isComplaintMode ? 'إعادة التحليل' : 'إعادة المحاولة'}
                </Button>
              </div>
            ) : null}

            <div ref={scrollAnchorRef} />
          </div>
        </div>

        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSend={() => void handleSend()}
          attachment={attachment}
          onAttachmentChange={setAttachment}
          disabled={isComposerDisabled}
          placeholder={
            isComplaintMode && analysis
              ? 'اكتمل البلاغ — احفظه أو انسخ الملخص من البطاقة.'
              : isComplaintMode
                ? 'اكتب إجابتك...'
                : CHAT_GREETING
          }
        />
      </div>

      <AnimatePresence>
        {isComplaintMode && (status === 'analyzing' || analysis) ? (
          <aside className="border-border w-full shrink-0 overflow-y-auto border-t p-4 sm:p-6 lg:w-96 lg:border-t-0 lg:border-l">
            <div className="flex flex-col gap-4">
              {status === 'analyzing' ? (
                <RecommendationSkeleton />
              ) : analysis ? (
                <>
                  <ProgressTimeline currentStage="ready" />
                  <RecommendationCard
                    analysis={analysis}
                    letter={letter}
                    onSave={() => setIsSaveModalOpen(true)}
                    isSaved={isSaved}
                    isSaving={isSaving}
                  />
                </>
              ) : null}
            </div>
          </aside>
        ) : null}
      </AnimatePresence>

      <AuthorityModal
        isOpen={isAuthorityModalOpen}
        entity={authorityEntity}
        reason={authorityReason}
        onCreateComplaint={requestComplaintCreation}
        onContinueChat={() => setIsAuthorityModalOpen(false)}
      />

      {analysis ? (
        <SaveComplaintModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          defaultTitle={buildComplaintTitle(analysis)}
          onConfirm={handleSaveComplaint}
          isSaving={isSaving}
        />
      ) : null}

      <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  )
}
