# BesserLernen

Turkce arayuzlu, acik kaynakli Almanca ogrenme uygulamasi. Anki tarzi araliklı tekrar (SRS) sistemiyle kelime, artikel, gramer ve daha fazlasini ogrenebilirsin.

![Light Mode](screenshots/light_03_anasayfa_home.png) ![Dark Mode](screenshots/dark_03_anasayfa_home.png)

## Ozellikler

### Calisma Modlari
- **Calis (SRS)** — Anki tarzi araliklı tekrar. Tekrar/Zor/Iyi/Kolay butonlariyla kartlari zamanlama
- **Ogren** — Flashcard tarzi ogrenme, kart cevirme
- **Test** — Yazarak cevaplama, anlık geri bildirim
- **Eslestir** — Kelime-anlam eslesirme oyunu (drag & drop)
- **Blast** — Hizli tur, sure bazli
- **Artikel Drill** — der/die/das egzersizi
- **Gramer Drill** — Nominativ/Akkusativ/Dativ hal eki egzersizi
- **Bosluk Doldurma** — Cumle icinde bosluk doldurma

### Akilli Kart Havuzu
Tum modlar akilli kart secimi yapar:
1. Tekrari gelmis kartlar (due date)
2. Ogrenme asamasindaki kartlar
3. Calismis ama ustalasilmamis kartlar
4. Yeni kartlar (gunluk limit dahilinde)

### Diger
- Dark/Light tema
- Deste Marketi — hazir desteleri tek tikla yukle
- Istatistikler — gunluk/haftalik calisma grafikleri, streak takibi
- JSON import/export
- Resimli kartlar (GitHub Storage veya local upload)
- Offline destek (Service Worker + sync queue)
- PWA — mobil cihaza yuklenebilir
- WCAG AA erisilebilirlik

## Ekran Goruntuleri

| Ekran | Light | Dark |
|-------|-------|------|
| Ana Sayfa | ![](screenshots/light_03_anasayfa_home.png) | ![](screenshots/dark_03_anasayfa_home.png) |
| Calisma | ![](screenshots/light_05_calisma_study.png) | ![](screenshots/dark_05_calisma_study.png) |
| SRS Tekrar | ![](screenshots/light_14_calis_srs_answer.png) | ![](screenshots/dark_14_calis_srs_answer.png) |
| Test | ![](screenshots/light_16_test.png) | ![](screenshots/dark_16_test.png) |
| Eslestir | ![](screenshots/light_17_eslestir_match.png) | ![](screenshots/dark_17_eslestir_match.png) |
| Artikel | ![](screenshots/light_19_artikel.png) | ![](screenshots/dark_19_artikel.png) |
| Market | ![](screenshots/light_08_market.png) | ![](screenshots/dark_08_market.png) |
| Ayarlar | ![](screenshots/light_07_ayarlar_settings.png) | ![](screenshots/dark_07_ayarlar_settings.png) |

## Teknolojiler

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes, Prisma ORM
- **Veritabani:** PostgreSQL (SQLite dev icin)
- **Auth:** JWT (httpOnly cookie)
- **Depolama:** Local uploads veya [GitHub Storage](https://github.com/efeumutaslan/besser-learner-storage)
- **Deste Marketi:** [besserlernen-decks](https://github.com/efeumutaslan/besserlernen-decks) reposu

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL (veya SQLite dev icin)

### Hizli Baslangic

```bash
# Repoyu klonla
git clone https://github.com/efeumutaslan/besser-learner.git
cd besser-learner

# Bagimliliklari yukle
npm install

# .env dosyasini olustur
cp .env.example .env
# DATABASE_URL ve JWT_SECRET degerlerini ayarla

# Veritabanini olustur ve baslat
npm run setup
```

### Ortam Degiskenleri

```env
# Zorunlu
DATABASE_URL="postgresql://user:pass@localhost:5432/besserlernen"
JWT_SECRET="guclu-bir-secret-key"

# Opsiyonel - GitHub Storage (resim upload)
GITHUB_STORAGE_TOKEN="ghp_..."
GITHUB_STORAGE_OWNER="efeumutaslan"
GITHUB_STORAGE_REPO="besser-learner-storage"

# Opsiyonel - Deste Marketi
DECK_REPO_OWNER="efeumutaslan"
DECK_REPO_NAME="besserlernen-decks"
```

### Komutlar

| Komut | Aciklama |
|-------|----------|
| `npm run dev` | Gelistirme sunucusu (localhost:3000) |
| `npm run build` | Uretim build'i |
| `npm start` | Uretim sunucusu |
| `npm run db:seed` | Ornek veri yukle |
| `npm run db:studio` | Prisma Studio (DB goruntuleme) |

## Iliskili Repolar

| Repo | Aciklama |
|------|----------|
| [besser-learner](https://github.com/efeumutaslan/besser-learner) | Ana uygulama (bu repo) |
| [besserlernen-decks](https://github.com/efeumutaslan/besserlernen-decks) | Deste Marketi icerikleri |
| [besser-learner-storage](https://github.com/efeumutaslan/besser-learner-storage) | Resim depolama (GitHub CDN) |

## Lisans

MIT

## Destek

BesserLernen tamamen ucretsiz ve acik kaynaklidir. Projeyi desteklemek istersen:
- Repoyu yildizla
- Bug veya oneri icin issue ac
- PR gondererek katki sagla
