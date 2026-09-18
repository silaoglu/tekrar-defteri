import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { SUBJECTS, REASONS, type Reason } from '../lib/data'

type Props = { toast: (t: string) => void }

/** Fotoğrafı en fazla 1400 px genişliğe küçültüp JPEG'e çevirir. */
function shrink(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1400 / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Fotoğraf işlenemedi'))), 'image/jpeg', 0.8)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Fotoğraf okunamadı'))
    }
    img.src = url
  })
}

export default function AddCard({ toast }: Props) {
  const [subject, setSubject] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [reason, setReason] = useState<Reason | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [picked, setPicked] = useState<{ blob: Blob; url: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const photo = picked?.blob ?? null
  const preview = picked?.url ?? null

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url)
  }, [picked])

  const ready = !!subject && !!topic && !!reason

  async function onFile(f: File | undefined) {
    if (!f) return
    try {
      const blob = await shrink(f)
      setPicked({ blob, url: URL.createObjectURL(blob) })
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    setError('')
    const form = new FormData()
    form.set('subject', subject!)
    form.set('topic', topic)
    form.set('reason', reason!)
    form.set('question', question)
    form.set('answer', answer)
    if (photo) form.set('photo', photo, 'soru.jpg')
    try {
      await api('/cards', { method: 'POST', body: form })
    } catch {
      setSaving(false)
      return setError('Kaydedilemedi, tekrar dene.')
    }
    setSaving(false)
    setSubject(null)
    setTopic('')
    setReason(null)
    setQuestion('')
    setAnswer('')
    setPicked(null)
    toast('Kaydedildi')
  }

  return (
    <>
      <h1>Yanlış ekle</h1>
      <p className="sub">Fotoğrafını çek, konusunu ve nedenini seç.</p>
      <div className="panel">
        <div className="field">
          <label className="photo" htmlFor="foto">
            {preview ? <img src={preview} alt="Seçilen soru" /> : 'Soru fotoğrafı ekle'}
          </label>
          <input type="file" id="foto" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <div className="field">
          <span className="lbl">Ders</span>
          <div className="chips">
            {Object.keys(SUBJECTS).map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={subject === d}
                onClick={() => {
                  setSubject(d)
                  setTopic('')
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        {subject && (
          <div className="field">
            <label htmlFor="konu">Konu</label>
            <select id="konu" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Seç</option>
              {SUBJECTS[subject].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <span className="lbl">Neden yanlış oldu?</span>
          <div className="chips">
            {REASONS.map((n) => (
              <button key={n} type="button" className="chip" aria-pressed={reason === n} onClick={() => setReason(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="soru">Soru metni (isteğe bağlı)</label>
          <textarea id="soru" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cevap">Doğru cevap (isteğe bağlı)</label>
          <textarea id="cevap" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" disabled={!ready || saving} onClick={save}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      <p className="note">Kaydettiğin soru yarın "Bugün" ekranında karşına çıkar. Konu listesi örnektir.</p>
    </>
  )
}
