import { authClient } from './auth'

const base = import.meta.env.VITE_API_URL

if (!base) {
  throw new Error('VITE_API_URL tanımlı olmalı (.env.example dosyasına bak).')
}

export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(`API ${status}`)
    this.status = status
  }
}

/** Oturum jetonunu Authorization başlığına ekleyip Neon Function'a istek atar. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { data } = await authClient.token()
  if (!data?.token) throw new ApiError(401)
  const { json, headers, ...rest } = init
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      ...headers,
      authorization: `Bearer ${data.token}`,
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
