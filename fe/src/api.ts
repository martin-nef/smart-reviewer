
import { API_URL } from './config'


// Usage example:
//   const reviews = await api<Review[]>('/reviews')
//   await api('/reviews', { method: 'POST', body: JSON.stringify({ title: 'hi' }) })
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  // if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
