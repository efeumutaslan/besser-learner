# BesserLernen - Gelistirme Plani

## Faz 1: Performans Optimizasyonu
**Hedef:** Buyuk destelerde (500+ kart) akici deneyim

| # | Gorev | Dosyalar | Oncelik |
|---|-------|----------|---------|
| 1.1 | **React.memo ile kart listesi optimizasyonu** — Kart bileseni memo'lanarak her state degisiminde tum listenin yeniden renderlanmasi onlenir | `desteler/[id]/page.tsx` | Yuksek |
| 1.2 | **useCallback/useMemo yaygınlastirma** — Handler fonksiyonlari ve turetilmis degerler memoize edilir. Ozellikle calisma modlarinda (10+ useState olan sayfalar) | Tum calisma modlari | Yuksek |
| 1.3 | **Ana sayfa paralel fetch** — Deste listesi ve istatistikler `Promise.all` ile ayni anda cekilir | `src/app/page.tsx` | Orta |
| 1.4 | **Eslestir timer optimizasyonu** — `setInterval(100ms)` yerine `requestAnimationFrame` kullanilir, CPU yuku azalir | `desteler/[id]/eslestir/page.tsx` | Orta |
| 1.5 | **Kart listesi virtualization** — 500+ kartli destelerde sadece gorunen kartlar renderlanir (react-window veya benzeri) | `desteler/[id]/page.tsx` | Dusuk |

---

## Faz 2: Kod Kalitesi & DRY Refaktoru
**Hedef:** Tekrarlanan mantigi merkezilestirip bakim kolayligi saglamak

| # | Gorev | Dosyalar | Oncelik |
|---|-------|----------|---------|
| 2.1 | **Deste istatistik hesabini tek utility'ye cikart** — 3 ayri route'ta (desteler, desteler/[id], calisma/[deckId]) tekrarlanan new/learning/review hesabi `src/lib/deck-stats.ts` altinda birlestir | 3 route + yeni utility | Yuksek |
| 2.2 | **API hata yonetimi utility'si** — 15+ route'ta tekrarlanan `if (error.message === "UNAUTHORIZED")` blogu tek `handleApiError(error)` fonksiyonuna donusturulur | Tum API route'lari + yeni utility | Yuksek |
| 2.3 | **Toast bildirim sistemi** — Basari/hata/uyari toast component'i olusturulur, `console.error` ile yutulan hatalar kullaniciya gosterilir | Yeni `src/components/ui/Toast.tsx` + context | Orta |
| 2.4 | **Error boundary'ler** — Her ana route'a `error.tsx` eklenir, crash durumunda kullaniciya anlamli mesaj ve "Tekrar Dene" butonu gosterilir | Her route klasoru | Orta |

---

## Faz 3: UX Cilalamasi
**Hedef:** Profesyonel his veren, kullanici dostu arayuz

| # | Gorev | Dosyalar | Oncelik |
|---|-------|----------|---------|
| 3.1 | **Loading skeleton'lar** — Spinner yerine icerik sekilli gri placeholder'lar. Algilanan yukleme suresini azaltir | Ana sayfa, deste sayfasi, calisma modlari | Yuksek |
| 3.2 | **Masaustu/tablet layout iyilestirmesi** — Calisma kartlari `max-w-md` ile sinirli, buyuk ekranlarda bos alan israf ediliyor. Responsive breakpoint'ler eklenir | Tum calisma modlari | Orta |
| 3.3 | **Eslestir moduna drag & drop** — Sadece tiklama yerine surukle-birak destegi. Mobilde daha dogal his | `desteler/[id]/eslestir/page.tsx` | Orta |
| 3.4 | **Artikel drill zorluk artisi** — Sik yanlis yapilan kelimeleri daha sik sorar (leitner mantigi). Su an hepsi esit siklikta | `desteler/[id]/artikel/page.tsx` | Dusuk |
| 3.5 | **Animasyon tutarliligi** — Tum modlarda ayni gecis animasyonlari. Bazi modlarda animasyon var, bazilarda yok | Tum calisma modlari | Dusuk |

---

## Faz 4: Guvenilirlik & Offline
**Hedef:** Baglanti kopsa bile calismayi kaybetme

| # | Gorev | Dosyalar | Oncelik |
|---|-------|----------|---------|
| 4.1 | **Feedback race condition duzeltmesi** — Ayni kart icin hizli tiklamalarda duplicate SRS guncellemesi olabiliyor. Atomik kontrol eklenir | `api/kartlar/[id]/feedback/route.ts` | Yuksek |
| 4.2 | **Offline calisma kuyrugu** — Son cekilen calisma kartlarini cache'le, offline modda tekrar yapmaya izin ver | `public/sw.js` + yeni offline logic | Orta |
| 4.3 | **Background sync** — Offline yapilan tekrarlar bir kuyruga atilir, internet gelince otomatik senkronize edilir | `public/sw.js` | Orta |
| 4.4 | **SW guncelleme bildirimi** — Yeni versiyon mevcut oldugunda kullaniciya "Guncelle" butonu goster | `src/components/Providers.tsx` | Dusuk |

---

## Faz 5: Erisilebilirlik (Accessibility)
**Hedef:** Temel WCAG AA uyumlulugu

| # | Gorev | Dosyalar | Oncelik |
|---|-------|----------|---------|
| 5.1 | **ARIA label'lar** — SRS butonlari, modal, progress bar icin screen reader destegi | Tum UI component'leri | Orta |
| 5.2 | **Klavye navigasyonu** — Skip-to-content link, tum butonlara tab erisilebilirligi | Layout + tum sayfalar | Orta |
| 5.3 | **Renk kontrasti** — gray-400 text/white bg kombinasyonlari WCAG AA gecmiyor. Minimum 4.5:1 kontrast orani saglanir | `globals.css` + component'ler | Dusuk |
| 5.4 | **Focus trap (modal)** — Modal acikken tab tusu modal disina cikamiyor | `src/components/ui/Modal.tsx` | Dusuk |

---

## Uygulama Sirasi

```
Faz 1 → Performans         ← SIRADAKI (en cok kullanici etkisi)
Faz 2 → Kod kalitesi       ← Paralel yapilabilir
Faz 3 → UX cilalamasi
Faz 4 → Guvenilirlik
Faz 5 → Erisilebilirlik
```

Her faz icinde "Yuksek" oncelikli gorevler once yapilir. Her faz bagimsiz deploy edilebilir.

**Deploy sureci:**
1. `npm run build` ile dogrulama
2. `git push` ile GitHub'a gonder
3. Sunucuda `sudo bash update.sh` ile guncelle

---

*Son guncelleme: 2026-04-04*
