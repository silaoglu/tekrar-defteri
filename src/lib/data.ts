export const SUBJECTS: Record<string, string[]> = {
  Türkçe: ['Sözcükte anlam', 'Cümlede anlam', 'Paragraf', 'Dil bilgisi', 'Yazım ve noktalama'],
  Matematik: ['Temel kavramlar', 'Sayılar', 'Üslü ve köklü sayılar', 'Oran ve orantı', 'Problemler', 'Fonksiyonlar', 'Geometri'],
  Fen: ['Fizik', 'Kimya', 'Biyoloji'],
  Sosyal: ['Tarih', 'Coğrafya', 'Felsefe', 'Din kültürü'],
}

export const REASONS = ['Bilmiyordum', 'Dikkatsizlik', 'Süre yetmedi'] as const
export type Reason = (typeof REASONS)[number]

export const TYT: [string, number][] = [
  ['Türkçe', 40],
  ['Sosyal', 20],
  ['Matematik', 40],
  ['Fen', 20],
]

export type Card = {
  id: string
  subject: string
  topic: string
  reason: Reason
  question: string
  answer: string
  photo_url: string | null
  box: number
  due_date: string
}

export type Section = { subject: string; d: number; y: number; b: number }

export type Exam = {
  id: string
  name: string
  taken_on: string
  sections: Section[]
  time_blank: number | null
}

export const net = (d: number, y: number) => +(d - y / 4).toFixed(2)

export const examTotals = (e: Exam) =>
  e.sections.reduce((t, s) => ({ d: t.d + s.d, y: t.y + s.y, b: t.b + s.b }), { d: 0, y: 0, b: 0 })

/** Tekrar aralıkları (gün): kutu 0 → 1, 1 → 3, 2 → 7, 3 → 14. */
const INTERVALS = [1, 3, 7, 14]

export function isoDate(daysFromToday = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Bildiysen bir kutu ilerler, bilemediysen başa döner ve yarın tekrar gelir. */
export function schedule(box: number, known: boolean) {
  const next = known ? Math.min(box + 1, INTERVALS.length - 1) : 0
  return { box: next, due_date: isoDate(INTERVALS[next]), days: INTERVALS[next] }
}
