import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('E-posta ya da şifre hatalı.')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Kayıt tamam. E-postana gelen bağlantıya tıklayıp giriş yap.')
    }
    setBusy(false)
  }

  return (
    <div className="auth">
      <h1>Tekrar Defteri</h1>
      <p className="sub">Yanlışlarını topla, zamanında tekrar et.</p>
      <form className="panel" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Şifre</label>
          <input
            id="pw"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        {info && <p className="note" role="status">{info}</p>}
        <div className="row">
          <button className="btn primary" disabled={busy}>{mode === 'in' ? 'Giriş yap' : 'Kayıt ol'}</button>
          <button type="button" className="btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'Hesap oluştur' : 'Girişe dön'}
          </button>
        </div>
      </form>
    </div>
  )
}
