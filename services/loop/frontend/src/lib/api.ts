const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export async function api(path: string, opts?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('token') ?? ''
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return res
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await api(path, opts)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}
