/**
 * Shared by the client ThemeProvider and the server-rendered bootstrap script.
 *
 * Deliberately a plain module with no 'use client' directive: importing this
 * from a server component must yield the actual string. Re-exporting it from
 * the provider instead produced a client-reference stub, which was inlined into
 * the bootstrap script and threw "Invalid or unexpected token" before any theme
 * could be applied.
 */
export const THEME_STORAGE_KEY = 'wasel:theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
