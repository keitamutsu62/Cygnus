const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export async function api(path: string, opts?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('token') ?? ''
  const isFormData = typeof FormData !== 'undefined' && opts?.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })
  if (res.status === 401 && !(window as unknown as { __CYGNUS_PREVIEW?: boolean }).__CYGNUS_PREVIEW) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return res
}

type MockFn = (path: string) => unknown | undefined

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const mockFn = (window as unknown as { __CYGNUS_PREVIEW_MOCK_FN?: MockFn }).__CYGNUS_PREVIEW_MOCK_FN
  if (mockFn) {
    const result = mockFn(path)
    if (result !== undefined) return result as T
  }
  const res = await api(path, opts)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}
