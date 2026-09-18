import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
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
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('bugun')
  const [msg, setMsg] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const toast = useCallback((t: string) => {
    setMsg(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(''), 1800)
  }, [])

  if (session === undefined) return null
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
          <button className="tab out" onClick={() => supabase.auth.signOut()}>Çıkış</button>
        </nav>
        <main>
          {view === 'bugun' && <Today toast={toast} goAdd={() => setView('ekle')} />}
          {view === 'ekle' && <AddCard userId={session.user.id} toast={toast} />}
          {view === 'deneme' && <Exams toast={toast} />}
        </main>
      </div>
      <div className={`toast${msg ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
    </>
  )
}
