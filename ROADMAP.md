# BesserLernen - Gelecek Geliştirme Planı

Bu dosya, uygulamaya eklenecek gelecek özellikleri detaylı şekilde belgelemektedir.
Mevcut durum: Faz 1-5 tamamlandı (Auth, Import/Export, Dark Mode, Ayarlar, Deploy).

---

## 1. Deste Marketi (Deck Marketplace)

### Konsept
Hazır destelerin paylaşıldığı, GitHub repo tabanlı bir market sistemi. Kullanıcılar kategorilere göre desteleri keşfedip tek tıkla indirebilir.

### Kategoriler
- Goethe A1, A2, B1, B2, C1
- Telc A1, A2, B1, B2
- Genel Kelime Hazinesi
- Fiiller / Sıfatlar / Bağlaçlar
- Günlük Konuşma
- Topluluk Desteleri

### Teknik Detaylar
- **Depolama:** Public GitHub reposu (mevcut media storage altyapısına benzer)
- **Format:** Her deste bir klasör: `marketplace/{kategori}/{deste-adi}/`
  - `deck.json` — Deste metadata + kartlar (mevcut import formatı)
  - `images/` — Kart resimleri
  - `audio/` — Kelime ve cümle ses dosyaları
- **API:** `GET /api/marketplace` — GitHub repo'dan kategori listesi çek
- **API:** `GET /api/marketplace/[category]` — Kategorideki desteleri listele
- **API:** `POST /api/marketplace/download` — Deste + medya dosyalarını indir, kullanıcının hesabına ekle
- **UI:** Yeni sayfa `/market` — Kategori grid, deste kartları, önizleme, indirme butonu
- **Önbellek:** Marketplace verisi client-side cache (mevcut `cachedFetch` altyapısı)

### Deste Gönderimi (PR Tabanlı)
- Kullanıcılar marketplace reposuna belirli formatta PR açar
- PR template ile zorunlu alanlar: deste adı, kategori, açıklama, seviye
- Sadece onaylanan PR'lar markette görünür
- Otomatik validasyon: JSON schema kontrolü, zorunlu alan kontrolü
- GitHub Actions ile CI: format doğrulama, duplicate kontrolü

---

## 2. Anki Tarzı Ayarlar

### Yeni Kartlar (Daily Limits)
- `newCardsPerDay`: Günlük yeni kart limiti (varsayılan: 20)
- `learningSteps`: Öğrenme adımları, dakika cinsinden (varsayılan: "1m 10m")
- `graduatingInterval`: Mezuniyet aralığı, gün (varsayılan: 1)
- `easyInterval`: Kolay aralığı, gün (varsayılan: 4)
- `insertionOrder`: Ekleme sırası — Sequential / Random

### Lapslar (Lapses)
- `relearningSteps`: Tekrar öğrenme adımları (varsayılan: "10m")
- `minimumInterval`: Minimum aralık, gün (varsayılan: 1)
- `leechThreshold`: Zülük eşiği (varsayılan: 8)
- `leechAction`: Suspend / Tag Only

### Aralıklar (Intervals)
- `maximumInterval`: Maksimum aralık, gün (varsayılan: 36500)
- `startingEase`: Başlangıç kolaylık faktörü (varsayılan: 2.50)
- `easyBonus`: Kolay bonusu (varsayılan: 1.30)
- `intervalModifier`: Aralık düzenleyici (varsayılan: 1.00)

### Gösterim Sırası (Display Order)
- `newCardGatherOrder`: Deck / Deck then random / Ascending position / Descending / Random notes
- `newCardSortOrder`: Card type / Order gathered / Card type then random / Random note then card type / Random
- `newReviewMix`: Show after reviews / Show before reviews / Mix with reviews
- `interdayLearningReviewMix`: Show after / before / mixed with reviews
- `reviewSortOrder`: Due date then random / Due date then deck / Deck then due date / Ascending / Descending / Relative overdueness / Random

### FSRS (Free Spaced Repetition Scheduler)
- `fsrsEnabled`: FSRS aç/kapa toggle (varsayılan: kapalı)
- `desiredRetention`: Hedef hatırlama oranı (varsayılan: 0.90, aralık: 0.70-0.99)
- `fsrsWeights`: Model ağırlıkları (otomatik optimize)
- `rescheduleCardsOnChange`: Değişiklikte kartları yeniden zamanla

### Gömme (Burying)
- `buryNewSiblings`: Yeni kardeşleri göm (varsayılan: kapalı)
- `buryReviewSiblings`: Tekrar kardeşleri göm (varsayılan: kapalı)
- `buryInterdayLearningSiblings`: Gün arası öğrenme kardeşlerini göm (varsayılan: kapalı)

### Ses (Audio)
- `disableAutoplay`: Otomatik oynatmayı kapat
- `skipQuestionWhenReplaying`: Tekrar oynatmada soruyu atla

### Zamanlayıcı (Timer)
- `maximumAnswerSeconds`: Maksimum cevap süresi (varsayılan: 60)
- `showAnswerTimer`: Cevap zamanlayıcısını göster
- `stopTimerOnAnswer`: Cevapta zamanlayıcıyı durdur

### Otomatik İlerleme (Auto Advance)
- `waitForAudio`: Sese bekle (varsayılan: açık)
- `answerAction`: Cevap aksiyonu (varsayılan: Bury Card)
- `questionAutoAdvanceSeconds`: Soru otomatik ilerleme süresi
- `answerAutoAdvanceSeconds`: Cevap otomatik ilerleme süresi

### Kolay Günler (Easy Days)
- Haftanın her günü için minimum yüzde ayarı (Pazartesi-Pazar: %0-%100)
- `applyEasyDaysToNewCards`: Yeni kartlara da uygula

### Gelişmiş Parametreler
- `maximumInterval`: Maksimum aralık (gün)
- `startingEase`: Başlangıç kolaylık
- `easyBonus`: Kolay bonusu
- `intervalModifier`: Aralık düzenleyici
- `hardInterval`: Zor aralık düzenleyici
- `newInterval`: Yeni aralık (laps sonrası)

### Teknik Uygulama
- **Schema:** `UserSettings` modeline tüm alanları ekle (JSON field veya ayrı alanlar)
- **API:** `PUT /api/auth/settings` — mevcut endpoint'i genişlet
- **UI:** `/ayarlar` sayfasına sekmeli yapı: Genel | Yeni Kartlar | Lapslar | Aralıklar | FSRS | Gelişmiş
- **SM-2 Güncelleme:** `src/lib/srs.ts` içindeki algoritma bu ayarlara göre çalışmalı

---

## 3. Akıllı Çalışma Modları

### Mevcut Sorun
Test, Learn, Match, Blast modları destedeki tüm kartlardan rastgele seçim yapıyor. 900 kartlık bir destede öğrenilmemiş kelimeler de denk geliyor.

### Çözüm: Kart Havuzu Filtresi
Her mod başlarken kart havuzunu filtrele:
1. **Öncelik 1:** Bugün tekrarı gelen kartlar (SRS due date ≤ today)
2. **Öncelik 2:** Daha önce çalışılmış kartlar (SEEN, FAMILIAR, MASTERED)
3. **Öncelik 3:** Yeni kartlar (sadece günlük limit kadar)

### Anki Tekrar Önceliği
- Ana ekranda vurgulu gösterim: "Bugün X kartın tekrarı var!"
- Tekrar kartları bitirmeden diğer modlara geçişte uyarı
- Tekrar kartları bittikten sonra: "Tebrikler! Şimdi diğer modlarla pratik yapabilirsin"

### Hal Ekleri (Deklinasyon) Entegrasyonu
- Öğrenme modlarında aktif olarak Nominativ/Akkusativ/Dativ soruları
- Soru tipi: "_____ Hund gebe ich Futter." → "dem" (Dativ)
- Kart verisindeki nominativ/akkusativ/dativ alanlarını kullan

### Artikel Zorunluluğu
- Türkçe → Almanca sorularında artikel zorunlu
- Doğru cevap: "der Hund" (sadece "Hund" kabul edilmez)
- Yanlış artikel → kısmi puan, doğru artikel göster
- Artikel olmayan kelimeler (fiil, sıfat) için bu kural geçersiz

### Bilmiyorum / Atla Seçeneği
- Her soru tipinde "Bilmiyorum / Atla" butonu
- Atlanan kartlar oturum sonunda tekrar gösterilir
- Atlama sayısı istatistiklere kaydedilir

### Mod-Bazlı Geliştirmeler

#### Learn (Öğren) Modu
- Çoktan seçmeli şıklarda sadece aynı seviyedeki kartlardan seç (benzer zorluk)
- Yazma sorularında autocomplete/hint sistemi (ilk harf ipucu)
- Flashcard modunda otomatik ses çalma (kelime + cümle)

#### Test Modu
- Soru havuzu: sadece en az SEEN seviyesindeki kartlar
- Zaman baskısı modunda Anki ayarlarındaki `maximumAnswerSeconds` kullan
- Test sonuçlarını SRS'e geri besle (doğru/yanlış → sonraki tekrar tarihini etkilesin)

#### Match (Eşleştir) Modu
- Artikel eşleştirme: renk kodlu kartları doğru artikelle eşle
- Cümle eşleştirme: Almanca cümle ↔ Türkçe çeviri
- Zorluk seviyeleri: Kolay (4 çift), Orta (6 çift), Zor (8 çift)

#### Blast Modu
- Combo sistemi: art arda doğru → çarpan artar
- Artikel hataları combo'yu kırsın (önem vurgusu)
- Leaderboard: kişisel en yüksek skorlar

---

## 4. Uygulama Öncelik Sırası

```
2. Akıllı Çalışma Modları  → En çok kullanım deneyimini iyileştirir
1. Anki Tarzı Ayarlar       → SRS algoritmasını güçlendirir
3. Deste Marketi             → İçerik ekosistemi oluşturur
```

Her özellik bağımsız olarak geliştirilebilir. Akıllı çalışma modları en fazla günlük kullanım etkisi yaratacağından öncelikli önerilir.

---

*Son güncelleme: 2026-03-30*
