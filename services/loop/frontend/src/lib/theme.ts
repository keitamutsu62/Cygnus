import { useState } from 'react'
import { getClaims } from './auth'

export type Theme = 'sand' | 'peach' | 'dark'

export const THEME_LABELS: Record<Theme, string> = {
  sand:  'サンド',
  peach: 'ピーチ',
  dark:  'Cygnus',
}

const THEME_COLORS: Record<Theme, string> = {
  sand:  '#f5f1ea',
  peach: '#fff5ec',
  dark:  '#1a1816',
}

const VALID_THEMES: Theme[] = ['sand', 'peach', 'dark']

function storageKey(): string {
  const claims = getClaims()
  return claims?.staff_id ? `cygnus:theme:${claims.staff_id}` : 'cygnus:theme'
}

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(storageKey()) as Theme | null
    if (stored && VALID_THEMES.includes(stored)) return stored
  } catch {}
  return 'sand'
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
