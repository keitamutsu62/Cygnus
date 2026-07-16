import { getToken } from './auth'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export async function api(path: string, opts?: RequestInit): Promise<Response> {
  const token = getToken() ?? ''
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })
}

type PreviewWindow = { __CYGNUS_PREVIEW_MOCKS?: Record<string, unknown> }

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const mocks = (window as unknown as PreviewWindow).__CYGNUS_PREVIEW_MOCKS
  if (mocks && Object.prototype.hasOwnProperty.call(mocks, path)) {
    return mocks[path] as T
  }
  const res = await api(path, opts)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}
