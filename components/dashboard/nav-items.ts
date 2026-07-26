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

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Highlighted as the primary action at the top of the sidebar. */
  isPrimary?: boolean
  /** Included in the mobile bottom navigation bar. */
  inBottomNav?: boolean
}

/**
 * The dashboard navigation. /dashboard/knowledge is deliberately absent —
 * the knowledge page is reserved for future admin functionality and is not
 * surfaced anywhere in the user interface.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/wasal?mode=complaint', label: 'بلاغ جديد', icon: SquarePen, isPrimary: true },
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, inBottomNav: true },
  { href: '/dashboard/complaints', label: 'البلاغات السابقة', icon: FileText, inBottomNav: true },
  { href: '/dashboard/conversations', label: 'المحادثات', icon: MessagesSquare, inBottomNav: true },
  { href: '/dashboard/drafts', label: 'المسودات', icon: FolderClock },
  { href: '/dashboard/profile', label: 'الملف الشخصي', icon: UserRound, inBottomNav: true },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

/** /dashboard must match exactly, or every child route would light it up. */
export function isNavItemActive(href: string, pathname: string): boolean {
  const path = href.split('?')[0]
  if (path === '/dashboard') return pathname === '/dashboard'
  return pathname === path || pathname.startsWith(`${path}/`)
}
