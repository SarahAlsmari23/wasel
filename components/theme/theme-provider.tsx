'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from '@/lib/theme/constants'

export type { ResolvedTheme, ThemePreference }

type ThemeContextValue = {
  /** What the user chose, including "follow the system". */
  preference: ThemePreference
  /** What is actually on screen right now. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Private browsing — fall through to the system default.
  }
  return 'system'
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Matches the inline bootstrap script's default so the first client render
  // agrees with the markup the server sent.
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>('light')

  // Adopt the persisted choice after mount; the bootstrap script has already
  // put the right class on <html>, so this only syncs React's copy of it.
  useEffect(() => {
    const stored = readStoredPreference()
    setPreferenceState(stored)
    setResolved(stored === 'system' ? systemTheme() : stored)
  }, [])

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return
    if (typeof window === 'undefined' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const next = query.matches ? 'dark' : 'light'
      setResolved(next)
      applyTheme(next)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Persistence is a convenience; the session still switches without it.
    }
    const nextResolved = next === 'system' ? systemTheme() : next
    setResolved(nextResolved)
    applyTheme(nextResolved)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Returns a light-mode default rather than throwing when no provider is
 * mounted — a missing theme context must never stop a page rendering.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    return { preference: 'system', resolved: 'light', setPreference: () => {} }
  }
  return context
}
