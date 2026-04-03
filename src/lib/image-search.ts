/**
 * Pixabay Image Search — Kart oluşturulurken otomatik resim çeker.
 * PIXABAY_API_KEY env var'ı yoksa sessizce null döner.
 * Bulunan resim URL'i kartın imageUrl'ine kaydedilir, böylece tekrar çekilmez.
 */

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const PIXABAY_ENDPOINT = "https://pixabay.com/api/";

interface PixabayHit {
  id: number;
  previewURL: string;       // 150px thumbnail
  webformatURL: string;     // 640px (24 saat geçerli)
  largeImageURL: string;    // 1280px
  tags: string;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

/**
 * Bir kelime için Pixabay'dan küçük resim URL'i arar.
 * previewURL (150px) kalıcı bir CDN URL'idir — webformatURL gibi expire olmaz.
 */
export async function searchImage(word: string): Promise<string | null> {
  if (!PIXABAY_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: word,
      image_type: "photo",
      per_page: "3",
      safesearch: "true",
      lang: "de",           // Almanca arama sonuçları
    });

    const res = await fetch(`${PIXABAY_ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(5000), // 5sn timeout
    });

    if (!res.ok) return null;

    const data: PixabayResponse = await res.json();

    if (data.hits.length === 0) {
      // Almanca'da sonuç yoksa İngilizce dene
      params.set("lang", "en");
      const retryRes = await fetch(`${PIXABAY_ENDPOINT}?${params}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!retryRes.ok) return null;
      const retryData: PixabayResponse = await retryRes.json();
      return retryData.hits[0]?.previewURL || null;
    }

    return data.hits[0]?.previewURL || null;
  } catch {
    // Timeout, network error vs. — sessizce geç
    return null;
  }
}

/**
 * Birden fazla kelime için toplu resim arar.
 * Rate limit'e dikkat ederek araya 100ms bekletir.
 * Sonuç: { word: imageUrl | null } map'i döner.
 */
export async function searchImagesForWords(
  words: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  if (!PIXABAY_API_KEY) {
    words.forEach((w) => results.set(w, null));
    return results;
  }

  for (const word of words) {
    const url = await searchImage(word);
    results.set(word, url);
    // Rate limit: 100 req/min → 600ms arası güvenli
    // Ama kısa batch'ler için 100ms yeterli
    if (words.length > 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return results;
}
