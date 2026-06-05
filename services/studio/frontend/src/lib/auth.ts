import type { StudioClaims } from '../types'

export function getToken(): string | null {
  return localStorage.getItem('studio_token')
}

export function setToken(token: string): void {
  localStorage.setItem('studio_token', token)
}

export function logout(): void {
  localStorage.removeItem('studio_token')
}

export function decodeClaims(token: string): StudioClaims | null {
  try {
    const payload = token.split('.')[1]
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as StudioClaims
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const claims = decodeClaims(token)
  if (!claims) return false
  return claims.exp * 1000 > Date.now()
}

export function getClaims(): StudioClaims | null {
  const token = getToken()
  if (!token) return null
  return decodeClaims(token)
}
