'use client'

import { Download, KeyRound, Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { exportMyDataAction } from '@/app/(site)/wasal/account-actions'
import { ChangePasswordModal } from '@/components/dashboard/profile-view'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { useChangeLocale } from '@/components/i18n/use-change-locale'
import { useTheme, type ThemePreference } from '@/components/theme/theme-provider'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { defineCopy, type Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: {
    general: 'عام',
    generalDescription: 'تفضيلات اللغة.',
    language: 'اللغة',
    appearance: 'المظهر',
    appearanceDescription: 'مظهر واجهة واصل.',
    themes: { light: 'الوضع الفاتح', dark: 'الوضع الداكن', system: 'حسب النظام' },
    followsDevice: (mode: string) => `يتبع جهازك (${mode})`,
    darkWord: 'داكن',
    lightWord: 'فاتح',
    themeApplied: (label: string) => `تم تفعيل ${label}.`,
    security: 'الأمان',
    securityDescription: 'حماية حسابك.',
    changePassword: 'تغيير كلمة المرور',
    changePasswordDescription: 'حدّث كلمة المرور الخاصة بحسابك.',
    change: 'تغيير',
    twoFactor: 'التحقق بخطوتين',
    twoFactorDescription: 'طبقة حماية إضافية عند تسجيل الدخول.',
    notAvailable: 'غير متاح حالياً',
    privacy: 'الخصوصية',
    privacyDescription: 'إدارة بياناتك الشخصية.',
    download: 'تنزيل بياناتي',
    downloadDescription: 'نسخة من حسابك ومحادثاتك وبلاغاتك بصيغة JSON.',
    downloadAction: 'تنزيل',
    downloaded: 'تم تنزيل بياناتك.',
    downloadFailed: 'تعذر تجهيز بياناتك. حاول مرة أخرى.',
    deleteAccount: 'حذف الحساب',
    deleteShort: 'حذف',
    deleteAccountDescription: 'حذف حسابك وجميع بياناتك نهائياً.',
    deleteTitle: 'حذف الحساب غير متاح بعد',
    deleteBody:
      'حذف الحساب بالكامل ذاتياً غير متاح بعد في المنصة. يمكنك الآن حذف أي محادثة — مع رسائلها وتفاصيلها والبلاغ المرتبط بها — نهائياً من صفحة المحادثات.',
    goToConversations: 'الذهاب إلى المحادثات',
    close: 'إغلاق',
  },
  en: {
    general: 'General',
    generalDescription: 'Language preferences.',
    language: 'Language',
    appearance: 'Appearance',
    appearanceDescription: "How Wasel's interface looks.",
    themes: { light: 'Light mode', dark: 'Dark mode', system: 'Match system' },
    followsDevice: (mode: string) => `Follows your device (${mode})`,
    darkWord: 'dark',
    lightWord: 'light',
    themeApplied: (label: string) => `${label} on.`,
    security: 'Security',
    securityDescription: 'Protect your account.',
    changePassword: 'Change password',
    changePasswordDescription: "Update your account's password.",
    change: 'Change',
    twoFactor: 'Two-step verification',
    twoFactorDescription: 'An extra layer of protection when signing in.',
    notAvailable: 'Not available yet',
    privacy: 'Privacy',
    privacyDescription: 'Manage your personal data.',
    download: 'Download my data',
    downloadDescription: 'A copy of your account, conversations and complaints as JSON.',
    downloadAction: 'Download',
    downloaded: 'Your data was downloaded.',
    downloadFailed: "Your data couldn't be prepared. Please try again.",
    deleteAccount: 'Delete account',
    deleteShort: 'Delete',
    deleteAccountDescription: 'Permanently delete your account and all your data.',
    deleteTitle: "Account deletion isn't available yet",
    deleteBody:
      "Full self-service account deletion isn't available in the platform yet. You can already permanently delete any conversation — with its messages, details and linked complaint — from the Conversations page.",
    goToConversations: 'Go to conversations',
    close: 'Close',
  },
})

const THEME_ICONS: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }

export function SettingsView() {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const { preference, resolved, setPreference } = useTheme()
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const changeLocale = useChangeLocale()

  function changeLanguage(next: Locale) {
    if (next !== locale) changeLocale(next)
  }

  async function handleDownloadData() {
    if (isExporting) return
    setIsExporting(true)
    try {
      const result = await exportMyDataAction()
      if (!result.success) {
        showToast(copy.downloadFailed, 'error')
        return
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'wasel-my-data.json'
      link.click()
      URL.revokeObjectURL(url)
      showToast(copy.downloaded)
    } catch {
      showToast(copy.downloadFailed, 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <SettingsSection title={copy.general} description={copy.generalDescription}>
        <Field htmlFor="settings-language" label={copy.language}>
          <Select
            id="settings-language"
            value={locale}
            onChange={(event) => changeLanguage(event.target.value as Locale)}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </Select>
        </Field>
      </SettingsSection>

      <SettingsSection title={copy.appearance} description={copy.appearanceDescription}>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(copy.themes) as ThemePreference[]).map((value) => (
            <ThemeOption
              key={value}
              icon={THEME_ICONS[value]}
              label={copy.themes[value]}
              note={
                value === 'system'
                  ? copy.followsDevice(resolved === 'dark' ? copy.darkWord : copy.lightWord)
                  : undefined
              }
              isActive={preference === value}
              onSelect={() => {
                setPreference(value)
                showToast(copy.themeApplied(copy.themes[value]), 'info')
              }}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={copy.security} description={copy.securityDescription}>
        <SettingsRow
          icon={KeyRound}
          title={copy.changePassword}
          description={copy.changePasswordDescription}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordOpen(true)}
            >
              {copy.change}
            </Button>
          }
        />
        <SettingsRow
          icon={ShieldCheck}
          title={copy.twoFactor}
          description={copy.twoFactorDescription}
          action={
            <span className="bg-surface-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
              {copy.notAvailable}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection title={copy.privacy} description={copy.privacyDescription}>
        <SettingsRow
          icon={Download}
          title={copy.download}
          description={copy.downloadDescription}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadData}
              isLoading={isExporting}
            >
              {copy.downloadAction}
            </Button>
          }
        />
        <SettingsRow
          icon={Trash2}
          title={copy.deleteAccount}
          description={copy.deleteAccountDescription}
          isDanger
          action={
            <Button type="button" variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
              {copy.deleteShort}
            </Button>
          }
        />
      </SettingsSection>

      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        footer={
          <>
            <Link
              href="/dashboard/conversations"
              className={buttonClasses('primary', 'md', 'w-full sm:flex-1')}
            >
              {copy.goToConversations}
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="w-full sm:flex-1"
            >
              {copy.close}
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
