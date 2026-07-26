'use client'

import { BookmarkCheck, Mail } from 'lucide-react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

/**
 * Returning to /wasal with `mode=complaint` resumes the complaint builder on
 * top of the conversation, which is restored from sessionStorage — so signing
 * in never costs the user their chat.
 */
const NEXT_PATH = '/wasal?mode=complaint'

type LoginRequiredModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Shown only at the moment a guest chooses to create a complaint — never on
 * arrival, and never as an interruption to the conversation itself.
 */
export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const encodedNext = encodeURIComponent(NEXT_PATH)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="خطوة أخيرة قبل إنشاء البلاغ"
      description="لإنشاء البلاغ وحفظه في حسابك، نحتاج فقط إلى تسجيل الدخول باستخدام بريدك الإلكتروني."
      footer={
        <>
          <Link
            href={`/auth/sign-in?next=${encodedNext}`}
            className={buttonClasses('primary', 'md', 'w-full sm:flex-1')}
          >
            تسجيل الدخول
          </Link>
          <Link
            href={`/auth/sign-up?next=${encodedNext}`}
            className={buttonClasses('outline', 'md', 'w-full sm:flex-1')}
          >
            إنشاء حساب
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="bg-primary/5 flex items-start gap-3 rounded-2xl p-4">
          <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-sm leading-relaxed">
            محادثتك محفوظة — ستعود إلى نفس النقطة تماماً بعد تسجيل الدخول، ولن تفقد أي شيء كتبته.
          </p>
        </div>

        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          يمكنك متابعة المحادثة والأسئلة العامة دون حساب في أي وقت.
        </p>
      </div>
    </Modal>
  )
}
