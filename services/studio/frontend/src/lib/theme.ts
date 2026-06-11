import { useState } from 'react'
import { getClaims } from './auth'

export type Theme = 'dark' | 'light' | 'pop'

export const THEME_LABELS: Record<Theme, string> = {
  dark:  'ダーク',
  light: 'ライト',
  pop:   'ポップ',
}

const THEME_COLORS: Record<Theme, string> = {
  dark:  '#1a1816',
  light: '#f7f3ee',
  pop:   '#ffffff',
}

function storageKey(): string {
  const claims = getClaims()
  return claims?.cygnus_account_id ? `cygnus:theme:${claims.cygnus_account_id}` : 'cygnus:theme'
}

export function loadTheme(): Theme {
  try {
    return (localStorage.getItem(storageKey()) as Theme) ?? 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadTheme)

  function setTheme(t: Theme) {
    setThemeState(t)
    try { localStorage.setItem(storageKey(), t) } catch {}
    applyTheme(t)
  }

  return { theme, setTheme }
}
