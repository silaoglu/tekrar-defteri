# Tekrar Defteri

Yanlış yaptığın soruları topla, aralıklı tekrarla çalış, denemelerini takip et.

- **Ön yüz:** Vite + React + TypeScript
- **Veritabanı / Auth / Fotoğraf:** Neon (Postgres `cards` ve `exams` tabloları, Neon Auth, özel `tekrar-defteri` bucket'ı)
- **API:** Neon Function (`api/index.ts`, Hono). Jetonu doğrular, her sorguyu `user_id` ile sınırlar, fotoğrafı bucket'a yazar ve imzalı URL üretir.
- **Yayın:** Cloudflare Workers (statik varlıklar)

## Geliştirme

```bash
npm install
neon link --project-id soft-moon-94810195 --branch production -y   # DATABASE_URL, AWS_* vb. .env.local'a gelir
# .env.example'daki VITE_NEON_AUTH_URL, VITE_API_URL ve ALLOWED_ORIGINS değerlerini .env.local'a ekle
npm run dev
```

## Yayın

```bash
neon deploy --env .env.local   # şema/auth/bucket + api Function'ı
npm run deploy                 # ön yüzü build edip Cloudflare Workers'a yükler
```

Veritabanı şeması `db/schema.sql` içinde; `neon deploy` tabloları oluşturmaz, bir kez uygulanmalıdır.

Yeni bir ön yüz adresi (ör. özel alan adı) eklerken iki yer güncellenmeli: `neon neon-auth domain add <adres>` ve `.env.local` içindeki `ALLOWED_ORIGINS` (sonra `neon deploy --env .env.local`).

Git bağlantılı build kullanılırsa `VITE_NEON_AUTH_URL` ve `VITE_API_URL` değişkenleri Cloudflare build ortamına da eklenmeli.

## Tekrar aralıkları

Bildiğin kart bir kutu ilerler (3, 7, 14 gün). Bilemediğin kart başa döner ve ertesi gün tekrar gelir.
