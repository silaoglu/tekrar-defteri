import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { isoDate, schedule, type Card } from '../lib/data'

type Props = { toast: (t: string) => void; goAdd: () => void }

export default function Today({ toast, goAdd }: Props) {
  const [cards, setCards] = useState<Card[] | null>(null)
  const [error, setError] = useState('')
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const [known, setKnown] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    api<Card[]>(`/cards/due?on=${isoDate()}`)
      .then((data) => live && setCards(data))
      .catch(() => live && setError('Kartlar yüklenemedi.'))
    return () => {
      live = false
    }
  }, [])

  const card = cards?.[i]
  const photoUrl = card?.photo_url ?? null

  async function rate(wasKnown: boolean) {
    if (!card || saving) return
    setSaving(true)
    const next = schedule(card.box, wasKnown)
    try {
      await api(`/cards/${card.id}`, { method: 'PATCH', json: { box: next.box, due_date: next.due_date } })
    } catch {
      setSaving(false)
      return toast('Kaydedilemedi, tekrar dene')
    }
    setSaving(false)
    if (wasKnown) setKnown((k) => k + 1)
    toast(next.days === 1 ? 'Yarın tekrar gelecek' : `Sonraki tekrar ${next.days} gün sonra`)
    setI((n) => n + 1)
    setOpen(false)
  }

  if (error) return <p className="err">{error}</p>
  if (!cards) return <p className="note">Yükleniyor…</p>

  const total = cards.length
  if (!card) {
    return (
      <>
        <h1>Bugün</h1>
        <p className="sub">Günün tekrarları</p>
        <div className="panel done">
          <p className="big">{total ? 'Bitti' : '0'}</p>
          <p>{total ? `Bugünkü ${total} tekrarı bitirdin. ${known} tanesini bildin.` : 'Bugün tekrar edecek sorun yok.'}</p>
          <p className="note">Bilemediklerin yarın yine gelecek. Bildiklerin birkaç gün sonra.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button className="btn" onClick={goAdd}>Yanlış ekle</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <h1>Bugün</h1>
      <p className="sub">{total} tekrar</p>
      <div className="panel qcard">
        <div className="row" style={{ gap: 6 }}>
          <span className="tag">{card.subject}</span>
          <span className="tag">{card.topic}</span>
        </div>
        {photoUrl && <img src={photoUrl} alt="Soru fotoğrafı" style={{ marginTop: 12 }} />}
        <p className="q">{card.question || 'Fotoğraftaki soruyu önce kendin çöz.'}</p>
        {open ? (
          <>
            <div className="answer">{card.answer || 'Cevabı defterinden ya da cevap anahtarından kontrol et.'}</div>
            <div className="row">
              <button className="btn primary" disabled={saving} onClick={() => rate(true)}>Bildim</button>
              <button className="btn" disabled={saving} onClick={() => rate(false)}>Bilemedim</button>
            </div>
          </>
        ) : (
          <>
            <p className="note">Önce çöz, sonra cevabı aç.</p>
            <div className="row"><button className="btn primary" onClick={() => setOpen(true)}>Cevabı göster</button></div>
          </>
        )}
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${(i / total) * 100}%` }} /></div>
      <p className="note">{i + 1} / {total}</p>
    </>
  )
}
