import {
  FileText,
  FolderClock,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  SquarePen,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'

export type NavItem = {
  href: string
  label: Record<Locale, string>
  /** Shorter label for the mobile bottom bar, where space is tight. */
  shortLabel?: Record<Locale, string>
  icon: LucideIcon
  isPrimary?: boolean
  inBottomNav?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/wasal?mode=complaint',
    label: { ar: 'بلاغ جديد', en: 'New complaint' },
    icon: SquarePen,
    isPrimary: true,
  },
  {
    href: '/dashboard',
    label: { ar: 'لوحة التحكم', en: 'Dashboard' },
    icon: LayoutDashboard,
    inBottomNav: true,
  },
  {
    href: '/dashboard/complaints',
    label: { ar: 'البلاغات السابقة', en: 'My complaints' },
    shortLabel: { ar: 'البلاغات', en: 'Complaints' },
    icon: FileText,
    inBottomNav: true,
  },
  {
    href: '/dashboard/conversations',
    label: { ar: 'المحادثات', en: 'Conversations' },
    shortLabel: { ar: 'المحادثات', en: 'Chats' },
    icon: MessagesSquare,
    inBottomNav: true,
  },
  {
    href: '/dashboard/drafts',
    label: { ar: 'المسودات', en: 'Drafts' },
    icon: FolderClock,
    inBottomNav: true,
  },
  {
    href: '/dashboard/profile',
    label: { ar: 'الملف الشخصي', en: 'Profile' },
    icon: UserRound,
  },
  {
    href: '/dashboard/settings',
    label: { ar: 'الإعدادات', en: 'Settings' },
    icon: Settings,
  },
]

export function isNavItemActive(href: string, pathname: string): boolean {
  const path = href.split('?')[0]
  if (path === '/dashboard') return pathname === '/dashboard'
  return pathname === path || pathname.startsWith(`${path}/`)
}
