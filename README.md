# Tekrar Defteri

Yanlış yaptığın soruları topla, aralıklı tekrarla çalış, denemelerini takip et.

- **Ön yüz:** Vite + React + TypeScript
- **Veritabanı / Auth / Fotoğraf:** Supabase (`cards`, `exams` tabloları, özel `question-photos` bucket'ı, hepsinde kullanıcıya özel RLS)
- **Yayın:** Cloudflare Workers (statik varlıklar)

## Geliştirme

```bash
npm install
cp .env.example .env.local   # publishable key'i Supabase panelinden al
npm run dev
```

## Yayın

```bash
npm run deploy   # build + wrangler deploy
```

Git bağlantılı build kullanılırsa `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` değişkenleri Cloudflare build ortamına da eklenmeli.

## Tekrar aralıkları

Bildiğin kart bir kutu ilerler (3, 7, 14 gün). Bilemediğin kart başa döner ve ertesi gün tekrar gelir.
