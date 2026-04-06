// Easy German YouTube kanal videolari
// Dinamik: RSS feed'den guncel videolar cekilir
// Fallback: RSS basarisiz olursa bu statik liste kullanilir
// Kaynak: https://www.youtube.com/@EasyGerman (Channel ID: UCbxb2fqe9oNgglAoYqsYOtQ)

export interface EasyGermanVideo {
  id: string; // YouTube video ID
  title: string;
  duration: number; // saniye (0 = bilinmiyor, player'dan alinir)
  level: "A1" | "A2" | "B1" | "B2";
  topic: string;
}

// Kanal RSS feed URL'si
const CHANNEL_ID = "UCbxb2fqe9oNgglAoYqsYOtQ";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

// RSS cache (5 dakika)
let rssCache: { videos: EasyGermanVideo[]; timestamp: number } | null = null;
const RSS_TTL = 5 * 60 * 1000;

function classifyVideo(title: string): { level: EasyGermanVideo["level"]; topic: string } {
  const t = title.toLowerCase();

  // Shorts / kisa videolari filtrele icin topic belirle
  if (t.includes("#shorts") || t.includes("#short")) {
    return { level: "A2", topic: "Kisa Video" };
  }

  // Super Easy German = A1-A2
  if (t.includes("super easy german")) {
    return { level: "A1", topic: "Super Easy German" };
  }

  // Easy German numara serisi = sokak roportajlari
  if (/easy german \d+/.test(t)) {
    // Konu tahmini
    if (t.includes("food") || t.includes("essen") || t.includes("küche") || t.includes("restaurant")) return { level: "A2", topic: "Yemek" };
    if (t.includes("berlin") || t.includes("münchen") || t.includes("hamburg")) return { level: "A2", topic: "Sehir Hayati" };
    if (t.includes("work") || t.includes("job") || t.includes("beruf") || t.includes("arbeit")) return { level: "B1", topic: "Is Hayati" };
    if (t.includes("opinion") || t.includes("meinung") || t.includes("think")) return { level: "B1", topic: "Gorusler" };
    if (t.includes("culture") || t.includes("tradition") || t.includes("weihnacht")) return { level: "A2", topic: "Kultur" };
    if (t.includes("learn") || t.includes("german") || t.includes("deutsch")) return { level: "A2", topic: "Almanca Ogrenme" };
    return { level: "A2", topic: "Sokak Roportaji" };
  }

  // Gramer videolari
  if (t.includes("grammatik") || t.includes("grammar") || t.includes("dativ") || t.includes("akkusativ") || t.includes("verb") || t.includes("konjunktiv")) {
    return { level: "B1", topic: "Gramer" };
  }

  // Podcast klipleri
  if (t.includes("podcast") || t.includes("#easygermanpodcast")) {
    return { level: "B1", topic: "Podcast" };
  }

  // Varsayilan
  return { level: "A2", topic: "Gunluk Almanca" };
}

function parseRSS(xml: string): EasyGermanVideo[] {
  const videos: EasyGermanVideo[] = [];
  // Basit XML parsing (regex ile - server-side, DOMParser yok)
  const entries = xml.split("<entry>").slice(1); // ilk bolum feed meta

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);

    if (idMatch && titleMatch) {
      const id = idMatch[1];
      const title = titleMatch[1];

      // Shorts'lari atla (genelde 60sn alti)
      if (title.includes("#shorts")) continue;

      const { level, topic } = classifyVideo(title);

      videos.push({
        id,
        title,
        duration: 0, // RSS'te sure yok, player'dan alinacak
        level,
        topic,
      });
    }
  }

  return videos;
}

export async function fetchFreshVideos(): Promise<EasyGermanVideo[]> {
  // Cache kontrol
  if (rssCache && Date.now() - rssCache.timestamp < RSS_TTL) {
    return rssCache.videos;
  }

  try {
    const res = await fetch(RSS_URL, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const freshVideos = parseRSS(xml);

    if (freshVideos.length > 0) {
      // Fallback listeyle birlestir (fresh + statik, duplikat kaldir)
      const freshIds = new Set(freshVideos.map((v) => v.id));
      const combined = [
        ...freshVideos,
        ...FALLBACK_VIDEOS.filter((v) => !freshIds.has(v.id)),
      ];

      rssCache = { videos: combined, timestamp: Date.now() };
      return combined;
    }
  } catch {
    // RSS basarisiz — fallback kullan
  }

  return FALLBACK_VIDEOS;
}

// Fallback: Gercek Easy German videolari (RSS basarisiz oldugunda)
export const FALLBACK_VIDEOS: EasyGermanVideo[] = [
  // RSS'ten dogrulanmis guncel videolar (Mart-Nisan 2026)
  { id: "SoZhk9FB0G8", title: "Germans Share Their Unpopular Opinions | Easy German 654", duration: 780, level: "B1", topic: "Gorusler" },
  { id: "BXv8NUSOZko", title: "Do People Learn German Everywhere? | Easy German 653", duration: 720, level: "A2", topic: "Almanca Ogrenme" },
  { id: "b0C_BOXmKt4", title: "When Does Berlin Feel Like Home? | Easy German 652", duration: 840, level: "B1", topic: "Sehir Hayati" },
  { id: "paIiikWpnok", title: "A Day at University in Slow German | Super Easy German 303", duration: 600, level: "A1", topic: "Super Easy German" },
  { id: "2axHWzwne34", title: "This German Verb Has a True Super Power | Super Easy German 302", duration: 540, level: "A1", topic: "Super Easy German" },
  { id: "ijqE6U6q7i4", title: "Werden als Hilfsverb", duration: 120, level: "B1", topic: "Gramer" },
  { id: "EYWUzAvP8_E", title: "Seit wann lebst du in Berlin?", duration: 60, level: "A2", topic: "Sehir Hayati" },
  { id: "wpcvDEfOulg", title: "Von der Eifersucht lernen", duration: 90, level: "B1", topic: "Gunluk Almanca" },
  { id: "MUfRqc7JQr8", title: "Was hast du heute noch vor?", duration: 60, level: "A2", topic: "Gunluk Almanca" },
  { id: "rF-09TQfYr8", title: "Janusz' Lieblingskaffee", duration: 90, level: "A1", topic: "Gunluk Almanca" },

  // Populer eski bolumler (kanal arsivinden bilinen videolar)
  { id: "5QiVTbRNgW8", title: "How to Order Food in German | Easy German 347", duration: 720, level: "A1", topic: "Restoran" },
  { id: "EhJ3WXhgi9g", title: "50 Most Common Verbs in German | Super Easy German", duration: 900, level: "A1", topic: "Super Easy German" },
  { id: "VnhFgbHkLjE", title: "How to Introduce Yourself in German | Easy German 362", duration: 600, level: "A1", topic: "Kendini Tanitma" },
  { id: "IgLkpYOoFBQ", title: "What Do Germans Think About Foreigners? | Easy German", duration: 780, level: "A2", topic: "Kultur" },
  { id: "hLtGZiDBsfk", title: "How to Count in German | Super Easy German", duration: 480, level: "A1", topic: "Super Easy German" },
  { id: "qJsa_wZa6KI", title: "Ordering Food at a Restaurant | Super Easy German", duration: 540, level: "A1", topic: "Restoran" },
  { id: "6pZovhaE3Qs", title: "At the Supermarket | Super Easy German", duration: 600, level: "A1", topic: "Alisveris" },
  { id: "9eFaYaQhMKs", title: "How to Use SEIN and HABEN | Super Easy German", duration: 660, level: "A1", topic: "Gramer" },
  { id: "M7R_JhrhccM", title: "German Habits and Customs | Easy German", duration: 840, level: "A2", topic: "Kultur" },
  { id: "Q1AmePJlB3U", title: "What Germans Think About German Food | Easy German", duration: 720, level: "A2", topic: "Yemek" },
  { id: "dF-RBuQ-Vxc", title: "How Expensive Is Life in Germany? | Easy German", duration: 900, level: "B1", topic: "Yasam Maliyeti" },
  { id: "P5i_aBcbCyg", title: "Understanding German Dialects | Easy German", duration: 780, level: "B2", topic: "Lehceler" },
  { id: "T_b4_ZPZiWI", title: "Konjunktiv II Explained | Easy German", duration: 720, level: "B1", topic: "Gramer" },
  { id: "p3a_ghqvEh4", title: "A Day in Berlin | Easy German", duration: 1020, level: "B1", topic: "Sehir Hayati" },
  { id: "NrMdS15RPQE", title: "German Relative Clauses | Easy German", duration: 660, level: "B1", topic: "Gramer" },
];

export const EASY_GERMAN_LEVELS = ["A1", "A2", "B1", "B2"] as const;
