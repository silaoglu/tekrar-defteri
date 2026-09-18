import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { Pool } from 'pg'
import { attachDatabasePool } from '@neon/functions'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = 'tekrar-defteri'
const REASONS = ['Bilmiyordum', 'Dikkatsizlik', 'Süre yetmedi']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
attachDatabasePool(pool)

// Neon, AWS_* değişkenlerini kendisi enjekte eder; yalnızca path-style adresleme şart.
const s3 = new S3Client({ forcePathStyle: true })

const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!))
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

type Env = { Variables: { userId: string } }
const app = new Hono<Env>()

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowHeaders: ['authorization', 'content-type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    maxAge: 600,
  }),
)

app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const header = c.req.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer })
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return c.json({ error: 'Unauthorized' }, 401)
    c.set('userId', payload.sub)
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
})

const text = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null)

async function photoUrl(key: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 })
}

app.get('/cards/due', async (c) => {
  const on = c.req.query('on') ?? ''
  if (!DAY.test(on)) return c.json({ error: 'on=YYYY-AA-GG gerekli' }, 400)
  const { rows } = await pool.query(
    `select id, subject, topic, reason, question, answer, photo_path, box, due_date::text as due_date
       from cards where user_id = $1 and due_date <= $2 order by due_date`,
    [c.get('userId'), on],
  )
  const cards = await Promise.all(
    rows.map(async (r) => ({ ...r, photo_url: r.photo_path ? await photoUrl(r.photo_path) : null })),
  )
  return c.json(cards)
})

app.post('/cards', async (c) => {
  const userId = c.get('userId')
  const form = await c.req.formData()
  const subject = text(form.get('subject'), 100)
  const topic = text(form.get('topic'), 200)
  const reason = text(form.get('reason'), 50)
  const question = text(form.get('question') ?? '', 5000)
  const answer = text(form.get('answer') ?? '', 5000)
  if (!subject || !topic || !reason || !REASONS.includes(reason) || question === null || answer === null) {
    return c.json({ error: 'Geçersiz alan' }, 400)
  }

  let photoPath: string | null = null
  const photo = form.get('photo')
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== 'image/jpeg' || photo.size > MAX_PHOTO_BYTES) return c.json({ error: 'Geçersiz fotoğraf' }, 400)
    photoPath = `${userId}/${crypto.randomUUID()}.jpg`
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: photoPath,
        Body: new Uint8Array(await photo.arrayBuffer()),
        ContentType: 'image/jpeg',
      }),
    )
  }

  try {
    const { rows } = await pool.query(
      `insert into cards (user_id, subject, topic, reason, question, answer, photo_path)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [userId, subject, topic, reason, question, answer, photoPath],
    )
    return c.json(rows[0], 201)
  } catch (e) {
    if (photoPath) await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photoPath })).catch(() => {})
    throw e
  }
})

app.patch('/cards/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!UUID.test(id) || !Number.isInteger(body?.box) || body.box < 0 || body.box > 3 || !DAY.test(body?.due_date ?? '')) {
    return c.json({ error: 'Geçersiz alan' }, 400)
  }
  const { rowCount } = await pool.query('update cards set box = $1, due_date = $2 where id = $3 and user_id = $4', [
    body.box,
    body.due_date,
    id,
    c.get('userId'),
  ])
  return rowCount ? c.json({ ok: true }) : c.json({ error: 'Bulunamadı' }, 404)
})

app.get('/exams', async (c) => {
  const { rows } = await pool.query(
    `select id, name, taken_on::text as taken_on, sections, time_blank
       from exams where user_id = $1 order by taken_on, created_at`,
    [c.get('userId')],
  )
  return c.json(rows)
})

app.post('/exams', async (c) => {
  const body = await c.req.json().catch(() => null)
  const name = text(body?.name, 200)
  const sections = body?.sections
  const timeBlank = body?.time_blank
  const sectionsOk =
    Array.isArray(sections) &&
    sections.length <= 10 &&
    sections.every(
      (s) =>
        typeof s?.subject === 'string' &&
        [s.d, s.y, s.b].every((n) => Number.isInteger(n)) &&
        s.d >= 0 &&
        s.y >= 0 &&
        s.b >= 0,
    )
  const timeOk = timeBlank === null || timeBlank === undefined || (Number.isInteger(timeBlank) && timeBlank >= 0)
  if (!name || !sectionsOk || !timeOk) return c.json({ error: 'Geçersiz alan' }, 400)
  const { rows } = await pool.query(
    'insert into exams (user_id, name, sections, time_blank) values ($1, $2, $3::jsonb, $4) returning id',
    [c.get('userId'), name, JSON.stringify(sections), timeBlank ?? null],
  )
  return c.json(rows[0], 201)
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Sunucu hatası' }, 500)
})

export default app
