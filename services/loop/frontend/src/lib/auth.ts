import type { AuthClaims } from '../types'

export function getSalonName(): string {
  const token = getToken()
  if (!token) return ''
  const claims = decodeClaims(token)
  return claims?.salon_name ?? ''
}

export function decodeClaims(token: string): AuthClaims | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as AuthClaims
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const claims = decodeClaims(token)
  if (!claims) return false
  return claims.exp * 1000 > Date.now()
}

export function getClaims(): AuthClaims | null {
  const token = getToken()
  if (!token) return null
  return decodeClaims(token)
}

export function logout(): void {
  localStorage.removeItem('token')
}
