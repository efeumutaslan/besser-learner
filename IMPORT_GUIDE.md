# BesserLernen - Veri Iceri Aktarma Kilavuzu

Bu kilavuz, BesserLernen'e JSON formatinda kaliteli desteler olusturup ice aktarmanizi saglar.

---

## JSON Yapisi

```json
{
  "version": "1.0",
  "decks": [
    {
      "name": "Deste Adi",
      "description": "Deste aciklamasi (istege bagli)",
      "color": "#6366F1",
      "cards": [
        {
          "word": "Almanca kelime",
          "wordTranslation": "Turkce karsiligi",
          "artikel": "der",
          "plural": "cogul hali",
          "nominativ": "yalın hal",
          "akkusativ": "belirtme hali",
          "dativ": "yonelme hali",
          "exampleSentence": "Ornek cumle",
          "sentenceTranslation": "Cumlenin Turkce karsiligi",
          "notes": "Ek notlar",
          "imageUrl": "https://example.com/resim.jpg",
          "wordAudioUrl": "https://example.com/kelime.mp3",
          "sentenceAudioUrl": "https://example.com/cumle.mp3"
        }
      ]
    }
  ]
}
```

---

## Alan Aciklamalari

### Deste (Deck)

| Alan | Zorunlu | Aciklama |
|------|---------|----------|
| `name` | Evet | Deste adi |
| `description` | Hayir | Kisa aciklama |
| `color` | Hayir | HEX renk kodu (varsayilan: `#6366F1`) |
| `cards` | Evet | Kart dizisi |

### Kart (Card)

| Alan | Zorunlu | Aciklama | Ornek |
|------|---------|----------|-------|
| `word` | Evet | Almanca kelime | `"Haus"` |
| `wordTranslation` | Evet | Turkce anlami | `"ev"` |
| `artikel` | Hayir | Tanimlık: `der`, `die`, `das` | `"das"` |
| `plural` | Hayir | Cogul hali | `"Häuser"` |
| `nominativ` | Hayir | Yalin hal (Wer/Was?) | `"das Haus"` |
| `akkusativ` | Hayir | Belirtme hali (Wen/Was?) | `"das Haus"` |
| `dativ` | Hayir | Yonelme hali (Wem?) | `"dem Haus"` |
| `exampleSentence` | Hayir | Almanca ornek cumle | `"Das Haus ist groß."` |
| `sentenceTranslation` | Hayir | Cumlenin Turkce karsiligi | `"Ev buyuk."` |
| `notes` | Hayir | Hatirlatma, ipucu, ek bilgi | `"Neutrum - das"` |
| `imageUrl` | Hayir | Resim URL'si (harici link) | `"https://..."` |
| `wordAudioUrl` | Hayir | Kelime telaffuz ses URL'si | `"https://..."` |
| `sentenceAudioUrl` | Hayir | Cumle ses URL'si | `"https://..."` |

---

## Limitler

- Maksimum dosya boyutu: **5 MB**
- Maksimum deste sayisi: **100**
- Deste basina maksimum kart: **5.000**
- Artikel sadece `der`, `die`, `das` olabilir (kucuk harf)

---

## Ornek Desteler

### 1. Temel Isimler (Nomen) - Tam Dolu Kartlar

```json
{
  "version": "1.0",
  "decks": [
    {
      "name": "A1 - Temel Isimler",
      "description": "A1 seviyesi gunluk hayatta en sik kullanilan isimler",
      "color": "#6366F1",
      "cards": [
        {
          "word": "Hund",
          "wordTranslation": "kopek",
          "artikel": "der",
          "plural": "Hunde",
          "nominativ": "der Hund",
          "akkusativ": "den Hund",
          "dativ": "dem Hund",
          "exampleSentence": "Der Hund spielt im Garten.",
          "sentenceTranslation": "Kopek bahcede oynuyor.",
          "notes": "Maskulin - der. Hayvanlar genelde cinsiyete gore artikel alir."
        },
        {
          "word": "Katze",
          "wordTranslation": "kedi",
          "artikel": "die",
          "plural": "Katzen",
          "nominativ": "die Katze",
          "akkusativ": "die Katze",
          "dativ": "der Katze",
          "exampleSentence": "Die Katze schläft auf dem Sofa.",
          "sentenceTranslation": "Kedi kanepede uyuyor.",
          "notes": "Feminin - die. -e ile biten isimler genelde feminindir."
        },
        {
          "word": "Kind",
          "wordTranslation": "cocuk",
          "artikel": "das",
          "plural": "Kinder",
          "nominativ": "das Kind",
          "akkusativ": "das Kind",
          "dativ": "dem Kind",
          "exampleSentence": "Das Kind liest ein Buch.",
          "sentenceTranslation": "Cocuk bir kitap okuyor.",
          "notes": "Neutrum - das."
        },
        {
          "word": "Schule",
          "wordTranslation": "okul",
          "artikel": "die",
          "plural": "Schulen",
          "nominativ": "die Schule",
          "akkusativ": "die Schule",
          "dativ": "der Schule",
          "exampleSentence": "Ich gehe in die Schule.",
          "sentenceTranslation": "Okula gidiyorum.",
          "notes": "Feminin - die. Akkusativ ile 'in die' kullanilir (yone dogru)."
        },
        {
          "word": "Buch",
          "wordTranslation": "kitap",
          "artikel": "das",
          "plural": "Bücher",
          "nominativ": "das Buch",
          "akkusativ": "das Buch",
          "dativ": "dem Buch",
          "exampleSentence": "Ich lese das Buch gern.",
          "sentenceTranslation": "Kitabi seveyerek okuyorum.",
          "notes": "Neutrum - das. Cogulu Umlaut alir: u -> ü."
        }
      ]
    }
  ]
}
```

### 2. Fiiller (Verben) - Artikel Olmadan

Fiiller icin artikel ve cogul alanlarini bos birakin. Halleri (nominativ/akkusativ/dativ) fiil cekimleri icin kullanabilirsiniz.

```json
{
  "version": "1.0",
  "decks": [
    {
      "name": "A1 - Temel Fiiller",
      "description": "En sik kullanilan A1 fiilleri",
      "color": "#22C55E",
      "cards": [
        {
          "word": "gehen",
          "wordTranslation": "gitmek",
          "nominativ": "ich gehe, du gehst, er geht",
          "exampleSentence": "Ich gehe jeden Tag zur Arbeit.",
          "sentenceTranslation": "Her gun ise gidiyorum.",
          "notes": "Duzensiz fiil. Gegangen (Partizip II). Sein ile cekimlenir."
        },
        {
          "word": "essen",
          "wordTranslation": "yemek yemek",
          "nominativ": "ich esse, du isst, er isst",
          "exampleSentence": "Wir essen zusammen zu Mittag.",
          "sentenceTranslation": "Birlikte ogle yemegi yiyoruz.",
          "notes": "Duzensiz: e->i degisimi (du isst). Gegessen (Partizip II)."
        },
        {
          "word": "sprechen",
          "wordTranslation": "konusmak",
          "nominativ": "ich spreche, du sprichst, er spricht",
          "exampleSentence": "Sprichst du Deutsch?",
          "sentenceTranslation": "Almanca konusuyor musun?",
          "notes": "Duzensiz: e->i degisimi. sprechen + Akkusativ (bir dili konusmak)."
        }
      ]
    }
  ]
}
```

### 3. Sifatlar (Adjektive) - Minimal Kartlar

En az `word` ve `wordTranslation` yeterlidir.

```json
{
  "version": "1.0",
  "decks": [
    {
      "name": "A1 - Sifatlar",
      "description": "Temel sifatlar ve zitliklari",
      "color": "#F59E0B",
      "cards": [
        {
          "word": "groß",
          "wordTranslation": "buyuk",
          "exampleSentence": "Das Haus ist sehr groß.",
          "sentenceTranslation": "Ev cok buyuk."
        },
        {
          "word": "klein",
          "wordTranslation": "kucuk",
          "exampleSentence": "Die Wohnung ist zu klein.",
          "sentenceTranslation": "Daire cok kucuk."
        },
        {
          "word": "schnell",
          "wordTranslation": "hizli",
          "exampleSentence": "Das Auto fährt schnell.",
          "sentenceTranslation": "Araba hizli gidiyor."
        }
      ]
    }
  ]
}
```

### 4. Birden Fazla Deste - Tek Dosya

```json
{
  "version": "1.0",
  "decks": [
    {
      "name": "B1 - Gesundheit",
      "description": "Saglik ile ilgili kelimeler",
      "color": "#EF4444",
      "cards": [
        {
          "word": "Arzt",
          "wordTranslation": "doktor",
          "artikel": "der",
          "plural": "Ärzte",
          "exampleSentence": "Ich muss zum Arzt gehen.",
          "sentenceTranslation": "Doktora gitmem gerekiyor."
        },
        {
          "word": "Krankenhaus",
          "wordTranslation": "hastane",
          "artikel": "das",
          "plural": "Krankenhäuser",
          "exampleSentence": "Er liegt im Krankenhaus.",
          "sentenceTranslation": "O hastanede yatiyor."
        }
      ]
    },
    {
      "name": "B1 - Arbeit & Beruf",
      "description": "Is ve meslek kelimeleri",
      "color": "#3B82F6",
      "cards": [
        {
          "word": "Bewerbung",
          "wordTranslation": "is basvurusu",
          "artikel": "die",
          "plural": "Bewerbungen",
          "exampleSentence": "Ich schreibe eine Bewerbung.",
          "sentenceTranslation": "Bir is basvurusu yaziyorum."
        },
        {
          "word": "Gehalt",
          "wordTranslation": "maas",
          "artikel": "das",
          "plural": "Gehälter",
          "exampleSentence": "Das Gehalt ist gut.",
          "sentenceTranslation": "Maas iyi."
        }
      ]
    }
  ]
}
```

---

## Kaliteli Deste Olusturma Ipuclari

### Artikel (der/die/das)

Isimlerde mutlaka artikel belirtin. BesserLernen artikele gore renk kodlamasi yapar:
- `der` (maskulin) → Mavi
- `die` (feminin) → Pembe
- `das` (notr) → Yesil

### Ornek Cumleler

- Kisa ve anlasilir cumleler secin (A1-A2 seviyesi icin 5-8 kelime ideal)
- Hedef kelimeyi cumle icinde kullanin
- Gunluk hayattan cumleler tercih edin

### Haller (Kasus)

Isimlerde nominativ, akkusativ ve dativ hallerini yazin. Bu sayede artikeldeki degisimi gorebilirsiniz:

| | Maskulin | Feminin | Neutrum |
|---|---------|---------|---------|
| **Nominativ** | **der** Mann | **die** Frau | **das** Kind |
| **Akkusativ** | **den** Mann | **die** Frau | **das** Kind |
| **Dativ** | **dem** Mann | **der** Frau | **dem** Kind |

### Cogul (Plural)

Almancada cogul olusturma kuralsizdir. Mutlaka belirtin:
- `-e` : der Hund → die Hund**e**
- `-er` : das Kind → die Kind**er**
- `-n/-en` : die Katze → die Katze**n**
- `-s` : das Auto → die Auto**s**
- Umlaut : das Buch → die B**ü**cher

### Notlar

`notes` alanini su amaclarla kullanin:
- Artikel hatirlatma ipuclari (ör. "-ung ile biten isimler hep die")
- Duzensiz fiil cekim bilgisi
- Benzer kelimelere dikkat (ör. "kennen vs. wissen")
- Kullanim farklari

### Deste Renkleri

Desteleri kategorilere gore renklendirebilirsiniz:

| Kategori | Renk | HEX |
|----------|------|-----|
| Genel | Mor (varsayilan) | `#6366F1` |
| Isimler | Mavi | `#3B82F6` |
| Fiiller | Yesil | `#22C55E` |
| Sifatlar | Sari | `#F59E0B` |
| Gunluk Konusmalar | Turuncu | `#F97316` |
| Saglik / Acil | Kirmizi | `#EF4444` |
| Is / Resmi | Lacivert | `#1E40AF` |

---

## Medya Dosyalari (Resim & Ses)

Kartlara resim ve ses dosyasi ekleyebilirsiniz. Iki yontem vardir:

### Yontem 1: Uygulama Icinden Yukleme (Onerilen)
Kart ekleme/duzenleme formunda resim ve ses yukleme alanlari vardir. Dosyalar otomatik olarak GitHub Storage'a yuklenir.

### Yontem 2: JSON ile Harici URL
JSON dosyasinda dogrudan URL verebilirsiniz. URL'ler halka acik (public) ve dogrudan erisilebilir olmalidir.

```json
{
  "word": "Hund",
  "wordTranslation": "kopek",
  "artikel": "der",
  "imageUrl": "https://raw.githubusercontent.com/user/repo/main/images/hund.jpg",
  "wordAudioUrl": "https://raw.githubusercontent.com/user/repo/main/audio/hund.mp3",
  "sentenceAudioUrl": "https://raw.githubusercontent.com/user/repo/main/audio/hund-satz.mp3"
}
```

### Desteklenen Formatlar
| Tip | Formatlar | Maks. Boyut |
|-----|-----------|-------------|
| Resim | JPEG, PNG, WebP, GIF | 10 MB |
| Ses | MP3, WAV, OGG, WebM | 10 MB |

### Ucretsiz Ses Kaynaklari
- [Forvo](https://forvo.com/) — Anadil konusmacilarindan telaffuz kayitlari
- [dict.cc](https://www.dict.cc/) — Almanca-Turkce sozluk, ses dosyalari ile
- Google Translate TTS — Kisa kelimeler icin

---

## Sik Yapilan Hatalar

| Hata | Sonuc | Cozum |
|------|-------|-------|
| `artikel: "Der"` (buyuk harf) | Gecersiz artikel hatasi | Kucuk harf kullanin: `"der"` |
| `word` veya `wordTranslation` bos | Kart atlanir | Her kartta ikisi de zorunlu |
| `cards` yerine `kartlar` | Deste atlanir | Ingilizce alan adlari kullanin |
| 5 MB'dan buyuk dosya | Reddedilir | Desteyi bolerek yukleyin |
| `"decks"` anahtari yok | Tum dosya reddedilir | Ust seviyede `"decks": [...]` olmali |

---

## Minimum Gecerli Ornek

En basit haliyle sadece `word` ve `wordTranslation` yeterlidir:

```json
{
  "decks": [
    {
      "name": "Hizli Deste",
      "cards": [
        { "word": "Hallo", "wordTranslation": "Merhaba" },
        { "word": "Tschüss", "wordTranslation": "Hoşçakal" },
        { "word": "Danke", "wordTranslation": "Teşekkürler" }
      ]
    }
  ]
}
```

---

## AI ile Deste Olusturma

ChatGPT, Claude veya baska bir AI aracina su prompt'u vererek hizlica deste olusturabilirsiniz:

```
Bana BesserLernen uygulamasi icin asagidaki JSON formatinda bir Almanca kelime destesi olustur.
Konu: [KONU - ör. "A1 yiyecek-icecek kelimeleri"]
Kart sayisi: [SAYI - ör. 20]

Her kart su alanlari icersin:
- word: Almanca kelime
- wordTranslation: Turkce karsiligi
- artikel: der/die/das (isimse)
- plural: cogul hali (isimse)
- nominativ, akkusativ, dativ: hal cekimleri (isimse)
- exampleSentence: Almanca ornek cumle
- sentenceTranslation: Turkce cevirisi
- notes: ogrenciye faydali ipucu

JSON formati:
{
  "version": "1.0",
  "decks": [{
    "name": "...",
    "description": "...",
    "cards": [...]
  }]
}
```

Bu sekilde dakikalar icinde yuzlerce kartlik kaliteli desteler olusturabilirsiniz.
