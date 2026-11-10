'use client'

import { BookmarkCheck, MessagesSquare } from 'lucide-react'
import Link from 'next/link'
import { useCopy } from '@/components/i18n/locale-provider'
import { buttonClasses } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { defineCopy } from '@/lib/i18n/config'

/**
 * Where the user lands after authenticating: back in Wasel, in complaint
 * mode, where the mount effect restores the saved conversation (messages,
 * collected details, pending action) from sessionStorage and continues it —
 * never restarting it (see wasal-chat.tsx).
 */
const NEXT_PATH = '/wasal?mode=complaint&resumePending=true'

const COPY = defineCopy({
  ar: {
    title: 'خطوة أخيرة قبل إنشاء البلاغ',
    description: 'لإنشاء البلاغ وحفظه في حسابك، نحتاج فقط إلى تسجيل الدخول.',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    saved: 'محادثتك محفوظة — ستعود إلى نفس النقطة تماماً بعد تسجيل الدخول، ولن تفقد أي شيء كتبته.',
    guest: 'يمكنك متابعة المحادثة والأسئلة العامة دون حساب في أي وقت.',
  },
  en: {
    title: 'One last step before creating the complaint',
    description: 'To create the complaint and save it to your account, you just need to sign in.',
    signIn: 'Sign in',
    signUp: 'Create account',
    saved:
      "Your conversation is saved — you'll return to exactly the same point after signing in, without losing anything you wrote.",
    guest: 'You can keep chatting and asking general questions without an account at any time.',
  },
})

type LoginRequiredModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const copy = useCopy(COPY)
  const encodedNext = encodeURIComponent(NEXT_PATH)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Link
            href={`/auth/sign-in?next=${encodedNext}`}
            className={buttonClasses('primary', 'md', 'w-full sm:flex-1')}
          >
            {copy.signIn}
          </Link>
          <Link
            href={`/auth/sign-up?next=${encodedNext}`}
            className={buttonClasses('outline', 'md', 'w-full sm:flex-1')}
          >
            {copy.signUp}
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="bg-primary/5 flex items-start gap-3 rounded-2xl p-4">
          <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-sm leading-relaxed">{copy.saved}</p>
        </div>

        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <MessagesSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.guest}
        </p>
      </div>
    </Modal>
  )
}
