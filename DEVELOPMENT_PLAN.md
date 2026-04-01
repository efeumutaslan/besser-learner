# BesserLernen - Gelistirme Plani

## Mevcut Durum Analizi

### Tespit Edilen Kritik Sorunlar

1. **Iki bagimsiz ilerleme sistemi birbirinden habersiz:**
   - SRS sistemi (status/interval/dueDate/easeFactor) → sadece `calis` (Anki tekrar) modunda kullaniliyor
   - Mastery sistemi (NEW/SEEN/FAMILIAR/MASTERED, correctHits) → sadece `ogren` modunda kullaniliyor
   - Birbirine hic etki etmiyor

2. **Fun modlar tum kartlari cekiyor:**
   - Ogren, Test, Eslestir, Blast hepsi `GET /api/desteler/${id}` ile TUM kartlari cekiyor
   - 900 kartlik destede ogrenilmemis kelimeler de rastgele geliyor
   - Hicbir filtreleme yok (SRS status, mastery, dueDate hicbiri kontrol edilmiyor)

3. **SRS algoritmasi tamamen hardcoded:**
   - Tekrar ogrenim: sadece 10dk (cok adimli ogrenme yok)
   - Mezuniyet araligi: 1 gun (sabit)
   - Kolay bonusu: 1.3x (sabit)
   - Zor carpani: 0.8x (sabit)
   - Max aralik, fuzz, FSRS hicbiri yok

---

## Faz 1: Akilli Kart Havuzu + SRS Geri Bildirimi (Backend)

### 1.1 Smart Pool API Endpoint
**Yeni dosya:** `src/app/api/desteler/[id]/smart-pool/route.ts`

- `GET /api/desteler/{id}/smart-pool?mode=learn|test|match|blast&limit=N`
- Oncelik sirasi:
  1. LEARNING/RELEARN kartlar (dueDate <= now) — aktif ogrenilen kartlar
  2. REVIEW kartlar (dueDate <= now) — tekrari gelen kartlar
  3. Calisilmis kartlar (mastery: SEEN, FAMILIAR) — ogreniyor ama henuz ustalasmamis
  4. Yeni kartlar (gunluk limit kadar) — henuz hic gorulmemis
- Response'ta `dueCount` alani (uyari banner'i icin)

### 1.2 SRS Feedback Endpoint
**Yeni dosya:** `src/app/api/kartlar/[id]/feedback/route.ts`

- `POST /api/kartlar/{id}/feedback` — `{ isCorrect: boolean, source: "learn"|"test"|"match"|"blast" }`
- Mantik:
  - NEW + dogru → status=LEARNING, dueDate=+10dk (karti SRS'e tanitir)
  - NEW + yanlis → mastery=SEEN (SRS'e henuz almaz)
  - LEARNING/REVIEW + dogru → soft "good" rating (calculateNextReview)
  - LEARNING/REVIEW + yanlis → soft "again" rating
- Dedup: Ayni gun ayni kart icin SRS degisikligi sadece 1 kez uygulanir
- Mastery + correctHits her zaman guncellenir

### 1.3 Deck Listesi API Guncelleme
**Degisiklik:** `src/app/api/desteler/route.ts`

- Mevcut dueCount hesabina LEARNING/RELEARN kartlari da dahil et

---

## Faz 2: Fun Modlari Akilli Havuza Bagla (Frontend)

### 2.1 Tum modlarda ortak degisiklikler
- `GET /api/desteler/${id}` → `GET /api/desteler/${id}/smart-pool?mode=X`
- Her soru tipine **"Bilmiyorum / Atla"** butonu
- Dogru/yanlis sonrasi `POST /api/kartlar/{id}/feedback` cagrisi
- **Artikel zorunlulugu**: TR→DE yonunde artikel varsa "der/die/das + Wort" beklenir
  - Yanlis artikel → kismi puan, dogru artikel goster
  - Artikel olmayan kelimeler (fiil, sifat) icin bu kural gecersiz

### 2.2 Mod-bazli degisiklikler

| Mod | Dosya | Degisiklik |
|-----|-------|-----------|
| Ogren | `desteler/[id]/ogren/page.tsx` | Smart pool + feedback + artikel + atla butonu |
| Test | `desteler/[id]/test/page.tsx` | Smart pool + feedback + artikel + atla butonu |
| Eslestir | `desteler/[id]/eslestir/page.tsx` | Smart pool + zorluk secici (4/6/8 cift) |
| Blast | `desteler/[id]/blast/page.tsx` | Smart pool + feedback |

### 2.3 Ana Sayfa + Deste Sayfasi
- **Ana sayfa** (`page.tsx`): "Bugun **X tekrar** kartin var!" vurgulu gosterim, pulsing indicator
- **Deste sayfasi** (`desteler/[id]/page.tsx`): Review bitmeden fun moda giriste uyari dialogu

---

## Faz 3: Anki Tarzi SRS Ayarlari

### 3.1 Schema Degisiklikleri (Migration 0002)

**Deck modeline eklenen alanlar** (her iki schema dosyasina):
```
learningSteps      String  @default("1,10")    // dakika, virgulle ayrilmis
graduatingInterval Int     @default(1)          // gun
easyInterval       Int     @default(4)          // gun
relearningSteps    String  @default("10")       // dakika
lapseMinInterval   Int     @default(1)          // gun
leechThreshold     Int     @default(8)
maxInterval        Int     @default(36500)       // ~100 yil
startingEase       Int     @default(250)         // 2.50 (100x olarak saklanir)
easyBonus          Int     @default(130)         // 1.30x (100x)
intervalModifier   Int     @default(100)         // 1.00x (100x)
hardModifier       Int     @default(120)         // 1.20x (100x)
```
**Card modeline:** `learningStep Int @default(0)` (cok adimli ogrenme indeksi)

### 3.2 SRS Ayarlari Parser
**Yeni dosya:** `src/lib/srs-settings.ts`
- `SRSSettings` interface + `parseDeckSettings(deck)` fonksiyonu
- Integer → Float donusumleri (250 → 2.50)

### 3.3 SRS Algoritma Refaktoru
**Degisiklik:** `src/lib/srs.ts`
- `calculateNextReview(card, rating, settings?)` — opsiyonel settings parametresi
- Cok adimli learning steps destegi (orn: 1dk → 10dk → mezuniyet)
- Max interval limiti
- Interval modifier, hard modifier parametrize
- Leech detection (lapses >= threshold → suspended)
- Varsayilan degerler mevcut davranisla ayni (geriye uyumlu)

### 3.4 API Guncellemeleri
- `src/app/api/calisma/review/route.ts` — deck settings'i cek, SRS'e gec
- `src/app/api/kartlar/[id]/feedback/route.ts` — ayni sekilde
- `src/app/api/desteler/[id]/route.ts` PUT — yeni SRS alanlarini kabul et

### 3.5 Ayarlar UI
**Yeni dosya:** `src/components/SRSSettingsPanel.tsx`
- Deste ayarlari modalindan erisilir (per-deck ayar)
- 3 sekme: Yeni Kartlar | Hatirlamama | Araliklar
- Her alan icin varsayilana sifirla butonu

---

## Faz 4 (Gelecek): Deste Marketi

### Konsept
GitHub repo bazli marketplace. Kullanicilar kategorilere gore hazir desteleri kesfedip tek tikla indirir.

### Teknik
- **Depolama:** Public GitHub reposu (besserlernen-decks)
- **Browse API:** `GET /api/market/browse?category=A1` → GitHub repo tree'den cek
- **Install API:** `POST /api/market/install` → mevcut import altyapisini kullanir
- **UI:** `/market` sayfasi — kategori grid, deste kartlari, onizleme, indirme butonu
- **Gonderim:** PR-bazli — kullanicilar marketplace reposuna PR acar, onaylananlar markette gorunur

### Kategoriler
- Goethe A1, A2, B1, B2, C1
- Telc A1, A2, B1, B2
- Genel Kelime Hazinesi
- Fiiller / Sifatlar / Baglaclar
- Gunluk Konusma
- Topluluk Desteleri

---

## Dosya Degisiklik Ozeti

| Faz | Dosya | Islem |
|-----|-------|-------|
| 1 | `src/app/api/desteler/[id]/smart-pool/route.ts` | YENI |
| 1 | `src/app/api/kartlar/[id]/feedback/route.ts` | YENI |
| 1 | `src/app/api/desteler/route.ts` | DEGISIKLIK |
| 2 | `src/app/desteler/[id]/ogren/page.tsx` | DEGISIKLIK |
| 2 | `src/app/desteler/[id]/test/page.tsx` | DEGISIKLIK |
| 2 | `src/app/desteler/[id]/eslestir/page.tsx` | DEGISIKLIK |
| 2 | `src/app/desteler/[id]/blast/page.tsx` | DEGISIKLIK |
| 2 | `src/app/page.tsx` | DEGISIKLIK |
| 2 | `src/app/desteler/[id]/page.tsx` | DEGISIKLIK |
| 3 | `prisma/schema.prisma` | DEGISIKLIK |
| 3 | `prisma/schema.production.prisma` | DEGISIKLIK |
| 3 | `src/lib/srs-settings.ts` | YENI |
| 3 | `src/lib/srs.ts` | DEGISIKLIK (buyuk refaktor) |
| 3 | `src/components/SRSSettingsPanel.tsx` | YENI |
| 3 | `src/app/api/calisma/review/route.ts` | DEGISIKLIK |
| 3 | `src/app/api/desteler/[id]/route.ts` | DEGISIKLIK |

---

## Oncelik Sirasi

```
Faz 1 → Backend temeli (smart pool + feedback)     ← EN ONCELIKLI
Faz 2 → Frontend entegrasyonu (modlari baglama)
Faz 3 → Anki ayarlari (schema + algoritma + UI)
Faz 4 → Deste marketi (gelecek)
```

Her faz bagimsiz olarak deploy edilebilir. Faz sonunda:
1. `npm run build` ile test
2. `git push` ile GitHub'a gonder
3. Sunucuda `sudo bash update.sh` ile guncelle

---

*Son guncelleme: 2026-04-01*
