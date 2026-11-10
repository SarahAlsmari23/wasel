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
  icon: LucideIcon
  /** Highlighted as the primary action at the top of the sidebar. */
  isPrimary?: boolean
  /** Included in the mobile bottom navigation bar. */
  inBottomNav?: boolean
  /** Shorter label for the narrow bottom bar, where the full one would wrap. */
  bottomNavLabel?: Record<Locale, string>
}

/**
 * The dashboard navigation. /dashboard/knowledge is deliberately absent —
 * the knowledge page is reserved for future admin functionality and is not
 * surfaced anywhere in the user interface.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/wasal?mode=complaint',
    label: { ar: 'بلاغ جديد', en: 'New Complaint' },
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
    label: { ar: 'البلاغات السابقة', en: 'Previous Complaints' },
    icon: FileText,
    inBottomNav: true,
    bottomNavLabel: { ar: 'البلاغات السابقة', en: 'Complaints' },
  },
  {
    href: '/dashboard/conversations',
    label: { ar: 'المحادثات', en: 'Conversations' },
    icon: MessagesSquare,
    inBottomNav: true,
  },
  {
    href: '/dashboard/drafts',
    label: { ar: 'المسودات', en: 'Drafts' },
    icon: FolderClock,
  },
  {
    href: '/dashboard/profile',
    label: { ar: 'الملف الشخصي', en: 'Profile' },
    icon: UserRound,
    inBottomNav: true,
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
