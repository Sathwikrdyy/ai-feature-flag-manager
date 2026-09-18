import type { FeatureFlag, NewFeatureFlag } from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '')

interface ApiErrorPayload {
  error?: { message?: string; requestId?: string }
}

const makeRequestId = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const requestId = makeRequestId()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | null
    const message = payload?.error?.message ?? `Request failed with status ${response.status}.`
    console.error(`[flags] request failed (${payload?.error?.requestId ?? requestId})`, { path, status: response.status })
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const flagService = {
  async list(): Promise<FeatureFlag[]> {
    return request<FeatureFlag[]>('/flags')
  },

  async setEnabled(id: string, enabled: boolean): Promise<FeatureFlag> {
    return request<FeatureFlag>(`/flags/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    })
  },

  async create(input: NewFeatureFlag): Promise<FeatureFlag> {
    return request<FeatureFlag>('/flags', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
