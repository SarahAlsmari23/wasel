'use client'

import { KeyRound, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { UserAvatar } from '@/components/dashboard/user-avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import { NOT_PROVIDED, type UserProfile } from '@/lib/auth/user-profile'

const MIN_PASSWORD_LENGTH = 6

type ProfileViewProps = {
  profile: UserProfile
}

export function ProfileView({ profile }: ProfileViewProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone === NOT_PROVIDED ? '' : profile.phone)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), phone: phone.trim() || undefined },
      })

      if (error) {
        showToast(getAuthErrorMessage(error), 'error')
        return
      }

      setIsEditOpen(false)
      router.refresh()
      showToast('تم تحديث الملف الشخصي.')
    } catch (unexpectedError) {
      showToast(getAuthErrorMessage(unexpectedError), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <UserAvatar name={profile.name} size="lg" />
        <div>
          <h2 className="text-heading text-lg font-semibold">{profile.name}</h2>
          <p className="text-muted-foreground text-sm" dir="ltr">
            {profile.email}
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            تعديل الملف الشخصي
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsPasswordOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            تغيير كلمة المرور
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-heading text-sm font-semibold">بيانات الحساب</h2>
        <InfoRow label="الاسم الكامل" value={profile.name} />
        <InfoRow label="البريد الإلكتروني" value={profile.email} isLtr />
        <InfoRow label="رقم الجوال" value={profile.phone} isLtr={profile.phone !== NOT_PROVIDED} />
        <InfoRow label="تاريخ إنشاء الحساب" value={formatDate(profile.createdAt)} />
        <InfoRow label="اللغة المفضلة" value={profile.preferredLanguage} />
      </Card>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="تعديل الملف الشخصي"
        description="سيظهر هذا الاسم في البلاغات التي يصيغها واصل نيابةً عنك."
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Field htmlFor="profile-name" label="الاسم الكامل">
            <TextInput
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSaving}
            />
          </Field>

          <Field htmlFor="profile-phone" label="رقم الجوال" hint="اختياري.">
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
              حفظ التغييرات
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
              className="w-full sm:flex-1"
            >
              إلغاء
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
    <div className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-sm" dir={isLtr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  )
}

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    setError(null)
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(getAuthErrorMessage(updateError))
        return
      }

      setPassword('')
      setConfirmPassword('')
      onClose()
      showToast('تم تحديث كلمة المرور.')
    } catch (unexpectedError) {
      setError(getAuthErrorMessage(unexpectedError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تغيير كلمة المرور">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          htmlFor="new-password"
          label="كلمة المرور الجديدة"
          hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل.`}
        >
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

        <Field htmlFor="confirm-new-password" label="تأكيد كلمة المرور" error={error ?? undefined}>
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
            تحديث كلمة المرور
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:flex-1"
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  )
}
