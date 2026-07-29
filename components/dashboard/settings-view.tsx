'use client'

import { Download, KeyRound, Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ChangePasswordModal } from '@/components/dashboard/profile-view'
import { useTheme, type ThemePreference } from '@/components/theme/theme-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import type { UserProfile } from '@/lib/auth/user-profile'

type SettingsViewProps = {
  profile: UserProfile
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'الوضع الفاتح', icon: Sun },
  { value: 'dark', label: 'الوضع الداكن', icon: Moon },
  { value: 'system', label: 'حسب النظام', icon: Monitor },
]

export function SettingsView({ profile }: SettingsViewProps) {
  const { showToast } = useToast()
  const { preference, resolved, setPreference } = useTheme()
  const resolvedLabel = resolved === 'dark' ? 'داكن' : 'فاتح'
  const [language, setLanguage] = useState('ar')
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  function handleDownloadData() {
    // Exports what the app actually holds about the user in this phase: their
    // account profile. No complaint data is persisted yet, so none is claimed.
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        accountCreatedAt: profile.createdAt,
        preferredLanguage: profile.preferredLanguage,
      },
      note: 'لا يتم حفظ البلاغات والمحادثات في قاعدة بيانات في هذه المرحلة.',
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wasal-account-data.json'
    link.click()
    URL.revokeObjectURL(url)

    showToast('تم تنزيل بياناتك.')
  }

  return (
    <>
      <SettingsSection title="عام" description="تفضيلات اللغة والإشعارات.">
        <Field htmlFor="settings-language" label="اللغة">
          <Select
            id="settings-language"
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value)
              showToast(
                event.target.value === 'ar'
                  ? 'اللغة المحددة: العربية.'
                  : 'الواجهة الإنجليزية ستتوفر قريباً.',
                event.target.value === 'ar' ? 'success' : 'info',
              )
            }}
          >
            <option value="ar">العربية</option>
            <option value="en">English (قريباً)</option>
          </Select>
        </Field>

        <ToggleSwitch
          checked={emailUpdates}
          onChange={(checked) => {
            setEmailUpdates(checked)
            showToast(checked ? 'تم تفعيل إشعارات البريد.' : 'تم إيقاف إشعارات البريد.', 'info')
          }}
          label="إشعارات البريد الإلكتروني"
          description="تنبيهات عند تحديث حالة بلاغاتك."
        />
      </SettingsSection>

      <SettingsSection title="المظهر" description="مظهر واجهة واصل.">
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => (
            <ThemeOption
              key={option.value}
              icon={option.icon}
              label={option.label}
              note={option.value === 'system' ? `يتبع جهازك (${resolvedLabel})` : undefined}
              isActive={preference === option.value}
              onSelect={() => {
                setPreference(option.value)
                showToast(`تم تفعيل ${option.label}.`, 'info')
              }}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="الأمان" description="حماية حسابك.">
        <SettingsRow
          icon={KeyRound}
          title="تغيير كلمة المرور"
          description="حدّث كلمة المرور الخاصة بحسابك."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordOpen(true)}
            >
              تغيير
            </Button>
          }
        />
        <SettingsRow
          icon={ShieldCheck}
          title="التحقق بخطوتين"
          description="طبقة حماية إضافية عند تسجيل الدخول."
          action={
            <span className="bg-primary/6 text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
              قريباً
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection title="الخصوصية" description="إدارة بياناتك الشخصية.">
        <SettingsRow
          icon={Download}
          title="تنزيل بياناتي"
          description="احصل على نسخة من بيانات حسابك بصيغة JSON."
          action={
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadData}>
              تنزيل
            </Button>
          }
        />
        <SettingsRow
          icon={Trash2}
          title="حذف الحساب"
          description="حذف حسابك وجميع بياناتك نهائياً."
          isDanger
          action={
            <Button type="button" variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
              حذف
            </Button>
          }
        />
      </SettingsSection>

      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="حذف الحساب"
        description="حذف الحساب إجراء نهائي لا يمكن التراجع عنه. هذه الميزة قيد التطوير حالياً — تواصل معنا لطلب حذف حسابك."
        footer={
          <>
            <a
              href="mailto:support@wasal.sa?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%A7%D9%84%D8%AD%D8%B3%D8%A7%D8%A8"
              className="bg-danger text-danger-foreground hover:bg-danger/90 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-medium transition-colors sm:flex-1"
            >
              مراسلة الدعم
            </a>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="w-full sm:flex-1"
            >
              إلغاء
            </Button>
          </>
        }
      />
    </>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-heading text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  )
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  action,
  isDanger = false,
}: {
  icon: typeof KeyRound
  title: string
  description: string
  action: React.ReactNode
  isDanger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isDanger ? 'bg-danger/8 text-danger' : 'bg-secondary/12 text-secondary',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function ThemeOption({
  icon: Icon,
  label,
  isActive = false,
  note,
  onSelect,
}: {
  icon: typeof Sun
  label: string
  isActive?: boolean
  note?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3.5 text-start transition-colors',
        isActive
          ? 'border-primary bg-surface-tint'
          : 'border-border hover:border-primary/30 hover:bg-surface-tint/60',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/8 text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">{label}</p>
        {note ? <p className="text-muted-foreground truncate text-xs">{note}</p> : null}
      </div>
    </button>
  )
}
