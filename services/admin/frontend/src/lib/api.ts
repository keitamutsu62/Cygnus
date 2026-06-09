const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export function getToken() {
  return localStorage.getItem('admin_token') ?? ''
}

export function setToken(t: string) {
  localStorage.setItem('admin_token', t)
}

export function clearToken() {
  localStorage.removeItem('admin_token')
}

export async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts?.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('unauthorized')
  }
  if (!res.ok) throw new Error(`${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
