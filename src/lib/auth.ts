import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

const url = import.meta.env.VITE_NEON_AUTH_URL

if (!url) {
  throw new Error('VITE_NEON_AUTH_URL tanımlı olmalı (.env.example dosyasına bak).')
}

export const authClient = createAuthClient(url, { adapter: BetterAuthReactAdapter() })
