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

/**
 * Neon Auth SDK'sı, get-session yanıtındaki `set-auth-jwt` başlığını `session.token` alanına yazar.
 * (`authClient.token()` oturum önbelleğinden döndüğü için `{ token }` vermez.)
 * Süresi dolan JWT'yi SDK kendisi yeniler; yine de JWT biçiminde olmayan bir değeri göndermeyiz.
 */
async function sessionJwt(): Promise<string> {
  const { data } = await authClient.getSession()
  const token = data?.session?.token
  if (!token || token.split('.').length !== 3) throw new ApiError(401)
  return token
}

/** Oturum JWT'sini Authorization başlığına ekleyip Neon Function'a istek atar. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = await sessionJwt()
  const { json, headers, ...rest } = init
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
