import { useCallback, useRef, useState } from 'react'
import { authClient } from './lib/auth'
import Auth from './components/Auth'
import Today from './components/Today'
import AddCard from './components/AddCard'
import Exams from './components/Exams'

type View = 'bugun' | 'ekle' | 'deneme'
const TABS: [View, string][] = [
  ['bugun', 'Bugün'],
  ['ekle', 'Yanlış ekle'],
  ['deneme', 'Denemeler'],
]

export default function App() {
  const { data: session, isPending } = authClient.useSession()
  const [view, setView] = useState<View>('bugun')
  const [msg, setMsg] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const toast = useCallback((t: string) => {
    setMsg(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(''), 1800)
  }, [])

  if (isPending) return null
  if (!session) return <Auth />

  return (
    <>
      <div className="app">
        <nav aria-label="Ekranlar">
          <p className="brand">
            Tekrar Defteri<small>{session.user.email}</small>
          </p>
          {TABS.map(([v, label]) => (
            <button key={v} className="tab" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
          <button className="tab out" onClick={() => authClient.signOut()}>Çıkış</button>
        </nav>
        <main>
          {view === 'bugun' && <Today toast={toast} goAdd={() => setView('ekle')} />}
          {view === 'ekle' && <AddCard toast={toast} />}
          {view === 'deneme' && <Exams toast={toast} />}
        </main>
      </div>
      <div className={`toast${msg ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
    </>
  )
}
