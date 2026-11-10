'use client'

import { KeyRound, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { UserAvatar } from '@/components/dashboard/user-avatar'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import { NOT_PROVIDED, type UserProfile } from '@/lib/auth/user-profile'

const MIN_PASSWORD_LENGTH = 6

const COPY = defineCopy({
  ar: {
    updated: 'تم تحديث الملف الشخصي.',
    nameRequired: 'الاسم الكامل مطلوب.',
    edit: 'تعديل الملف الشخصي',
    changePassword: 'تغيير كلمة المرور',
    accountDetails: 'بيانات الحساب',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الجوال',
    createdAt: 'تاريخ إنشاء الحساب',
    language: 'لغة الواجهة',
    languageName: 'العربية',
    notProvided: 'غير مضاف',
    editDescription: 'سيظهر هذا الاسم في البلاغات التي يصيغها واصل لك.',
    optional: 'اختياري.',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    passwordsMismatch: 'كلمتا المرور غير متطابقتين.',
    passwordUpdated: 'تم تحديث كلمة المرور.',
    newPassword: 'كلمة المرور الجديدة',
    passwordHint: `${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
    confirmPassword: 'تأكيد كلمة المرور',
    updatePassword: 'تحديث كلمة المرور',
  },
  en: {
    updated: 'Profile updated.',
    nameRequired: 'Full name is required.',
    edit: 'Edit profile',
    changePassword: 'Change password',
    accountDetails: 'Account details',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Mobile number',
    createdAt: 'Account created',
    language: 'Interface language',
    languageName: 'English',
    notProvided: 'Not provided',
    editDescription: 'This name appears on the complaints Wasel drafts for you.',
    optional: 'Optional.',
    save: 'Save changes',
    cancel: 'Cancel',
    passwordsMismatch: "The passwords don't match.",
    passwordUpdated: 'Password updated.',
    newPassword: 'New password',
    passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters.`,
    confirmPassword: 'Confirm password',
    updatePassword: 'Update password',
  },
})

type ProfileViewProps = {
  profile: UserProfile
}

export function ProfileView({ profile }: ProfileViewProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const locale = useLocale()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone === NOT_PROVIDED ? '' : profile.phone)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    if (!name.trim()) {
      showToast(copy.nameRequired, 'error')
      return
    }
    setIsSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), phone: phone.trim() || undefined },
      })

      if (error) {
        showToast(getAuthErrorMessage(error, locale), 'error')
        return
      }

      setIsEditOpen(false)
      router.refresh()
      showToast(copy.updated)
    } catch (unexpectedError) {
      showToast(getAuthErrorMessage(unexpectedError, locale), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Identity: one horizontal row — avatar, name and email, then actions. */}
      <div className="wasel-brand-band border-border flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={profile.name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-heading truncate text-lg font-semibold">{profile.name}</h2>
            <p className="text-muted-foreground truncate text-sm" dir="ltr">
              {profile.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.edit}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsPasswordOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.changePassword}
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-heading text-sm font-semibold">{copy.accountDetails}</h2>
        <dl className="bg-surface border-border divide-border divide-y rounded-2xl border">
          <InfoRow label={copy.fullName} value={profile.name} />
          <InfoRow label={copy.email} value={profile.email} isLtr />
          <InfoRow
            label={copy.phone}
            value={profile.phone === NOT_PROVIDED ? copy.notProvided : profile.phone}
            isLtr={profile.phone !== NOT_PROVIDED}
          />
          <InfoRow label={copy.createdAt} value={formatDate(profile.createdAt, locale)} />
          <InfoRow label={copy.language} value={copy.languageName} />
        </dl>
      </section>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={copy.edit}
        description={copy.editDescription}
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Field htmlFor="profile-name" label={copy.fullName}>
            <TextInput
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSaving}
            />
          </Field>

          <Field htmlFor="profile-phone" label={copy.phone} hint={copy.optional}>
            <TextInput
              id="profile-phone"
              type="tel"
              dir="ltr"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isSaving}
            />
          </Field>

          <div className="mt-1 flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" isLoading={isSaving} className="w-full sm:flex-1">
              {copy.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
              className="w-full sm:flex-1"
            >
              {copy.cancel}
            </Button>
          </div>
        </form>
      </Modal>

      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
    </>
  )
}

function InfoRow({
  label,
  value,
  isLtr = false,
}: {
  label: string
  value: string
  isLtr?: boolean
}) {
  return (
    <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
      <dt className="text-muted-foreground text-xs sm:text-sm">{label}</dt>
      <dd className="text-heading min-w-0 truncate text-sm font-medium">
        <span dir={isLtr ? 'ltr' : undefined}>{value}</span>
      </dd>
    </div>
  )
}

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const locale = useLocale()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    setError(null)
    if (password !== confirmPassword) {
      setError(copy.passwordsMismatch)
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(getAuthErrorMessage(updateError, locale))
        return
      }

      setPassword('')
      setConfirmPassword('')
      onClose()
      showToast(copy.passwordUpdated)
    } catch (unexpectedError) {
      setError(getAuthErrorMessage(unexpectedError, locale))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.changePassword}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field htmlFor="new-password" label={copy.newPassword} hint={copy.passwordHint}>
          <TextInput
            id="new-password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSaving}
          />
        </Field>

        <Field
          htmlFor="confirm-new-password"
          label={copy.confirmPassword}
          error={error ?? undefined}
        >
          <TextInput
            id="confirm-new-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSaving}
            aria-invalid={error ? true : undefined}
          />
        </Field>

        <div className="mt-1 flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" isLoading={isSaving} className="w-full sm:flex-1">
            {copy.updatePassword}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:flex-1"
          >
            {copy.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
