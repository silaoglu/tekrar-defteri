import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TYT, net, examTotals, type Exam, type Section } from '../lib/data'

type Props = { toast: (t: string) => void }

function Chart({ points }: { points: number[] }) {
  const W = 560, H = 200, p = 32, max = 120
  const x = (i: number) => (points.length === 1 ? W / 2 : p + (i * (W - 2 * p)) / (points.length - 1))
  const y = (v: number) => H - p - (Math.max(v, 0) / max) * (H - 2 * p)
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Toplam net grafiği">
      {[0, 30, 60, 90, 120].map((v) => (
        <g key={v}>
          <line x1={p} x2={W - p} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={4} y={y(v) + 4} fontSize={11} fill="var(--muted)">{v}</text>
        </g>
      ))}
      <path d={line} fill="none" stroke="var(--blue)" strokeWidth={3} />
      {points.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={6} fill="var(--blue)" />
          <text x={x(i)} y={y(v) - 12} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">{v}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Exams({ toast }: Props) {
  const [exams, setExams] = useState<Exam[] | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [rows, setRows] = useState<{ d: string; y: string }[]>(TYT.map(() => ({ d: '', y: '' })))
  const [timeBlank, setTimeBlank] = useState('')
  const [saving, setSaving] = useState(false)

  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    supabase
      .from('exams')
      .select('id,name,taken_on,sections,time_blank')
      .order('taken_on')
      .order('created_at')
      .then(({ data, error }) => {
        if (!live) return
        if (error) setError('Denemeler yüklenemedi.')
        else setExams(data as Exam[])
      })
    return () => {
      live = false
    }
  }, [reload])

  const parsed: Section[] = TYT.map(([subject, n], i) => {
    const d = Number(rows[i].d) || 0
    const y = Number(rows[i].y) || 0
    return { subject, d, y, b: n - d - y }
  })
  const problem = parsed.map((s, i) => (s.b < 0 ? `${s.subject}: doğru ve yanlış toplamı ${TYT[i][1]} soruyu geçiyor.` : '')).find(Boolean) ?? ''

  async function save() {
    if (problem || saving || !exams) return
    setSaving(true)
    const { error } = await supabase.from('exams').insert({
      name: `Deneme ${exams.length + 1}`,
      sections: parsed,
      time_blank: timeBlank === '' ? null : Number(timeBlank),
    })
    setSaving(false)
    if (error) return toast('Kaydedilemedi, tekrar dene')
    setAdding(false)
    setRows(TYT.map(() => ({ d: '', y: '' })))
    setTimeBlank('')
    toast('Kaydedildi')
    setReload((n) => n + 1)
  }

  if (error) return <p className="err">{error}</p>
  if (!exams) return <p className="note">Yükleniyor…</p>

  const last = exams[exams.length - 1]
  const lastTotals = last && examTotals(last)
  const points = exams.map((e) => {
    const t = examTotals(e)
    return net(t.d, t.y)
  })

  return (
    <>
      <h1>Denemeler</h1>
      <p className="sub">Her denemeden sonra ders ders gir.</p>
      {last && lastTotals ? (
        <div className="panel">
          <p className="note" style={{ margin: 0 }}>Son deneme toplam net</p>
          <p className="big">{net(lastTotals.d, lastTotals.y)}</p>
          <p className="note">
            {lastTotals.d} doğru, {lastTotals.y} yanlış, {lastTotals.b} boş
            {last.time_blank != null && ` (süre yetmediği için ${last.time_blank} boş)`}
          </p>
          <Chart points={points} />
          {exams.length < 2 && <p className="note">İkinci denemeden sonra çizgi oluşur.</p>}
        </div>
      ) : (
        <div className="panel"><p className="note" style={{ margin: 0 }}>Henüz deneme yok. İlkini ekle.</p></div>
      )}

      {adding ? (
        <div className="panel">
          <p style={{ fontWeight: 600, margin: '0 0 10px' }}>Yeni TYT denemesi</p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th></tr>
              </thead>
              <tbody>
                {TYT.map(([subject, n], i) => (
                  <tr key={subject}>
                    <td>{subject} <span className="note">({n})</span></td>
                    {(['d', 'y'] as const).map((k) => (
                      <td key={k}>
                        <input
                          type="number"
                          min={0}
                          max={n}
                          inputMode="numeric"
                          aria-label={`${subject} ${k === 'd' ? 'doğru' : 'yanlış'}`}
                          value={rows[i][k]}
                          onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))}
                        />
                      </td>
                    ))}
                    <td>{parsed[i].b < 0 ? '!' : parsed[i].b}</td>
                    <td>{net(parsed[i].d, parsed[i].y)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="sure">Süre yetmediği için boş kalan soru</label>
            <input id="sure" type="number" min={0} max={120} inputMode="numeric" value={timeBlank} onChange={(e) => setTimeBlank(e.target.value)} />
          </div>
          {problem && <p className="err" role="alert">{problem}</p>}
          <div className="row">
            <button className="btn primary" disabled={!!problem || saving} onClick={save}>Kaydet</button>
            <button className="btn" onClick={() => setAdding(false)}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ marginBottom: 20 }}>
          <button className="btn primary" onClick={() => setAdding(true)}>Deneme ekle</button>
        </div>
      )}

      {exams.length > 0 && (
        <div className="panel">
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Tüm denemeler</p>
          {exams.slice().reverse().map((e) => {
            const t = examTotals(e)
            return (
              <div className="exam" key={e.id}>
                <div>
                  {e.name}
                  <br />
                  <span className="note">{new Date(e.taken_on).toLocaleDateString('tr-TR')}</span>
                </div>
                <b>{net(t.d, t.y)}</b>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
