// Easy German YouTube kanal videolari
// Kaynak: https://www.youtube.com/@EasyGerman
// Her video: id, baslik, sure (saniye), seviye, konu

export interface EasyGermanVideo {
  id: string; // YouTube video ID
  title: string;
  duration: number; // saniye
  level: "A1" | "A2" | "B1" | "B2";
  topic: string;
}

export const EASY_GERMAN_VIDEOS: EasyGermanVideo[] = [
  // Super Easy German (A1-A2)
  { id: "0IFDuhdB2Hk", title: "50 Common German Phrases for Beginners", duration: 600, level: "A1", topic: "Temel Kaliplar" },
  { id: "yrBRZR3a1vE", title: "German Greetings and Goodbyes", duration: 480, level: "A1", topic: "Selamlasma" },
  { id: "pVHGrSjPEn4", title: "How to Introduce Yourself in German", duration: 540, level: "A1", topic: "Kendini Tanitma" },
  { id: "J6AIqMsEhJA", title: "German Numbers 1-100", duration: 420, level: "A1", topic: "Sayilar" },
  { id: "N3m2WUON5I8", title: "Days of the Week & Months in German", duration: 360, level: "A1", topic: "Gunler ve Aylar" },
  { id: "hltBHilsIrY", title: "Ordering Food in German", duration: 660, level: "A1", topic: "Restoran" },
  { id: "XrRqFkcMzZc", title: "At the Supermarket in Germany", duration: 720, level: "A1", topic: "Alisveris" },
  { id: "RuGmc662HDg", title: "Telling Time in German", duration: 480, level: "A1", topic: "Saat" },
  { id: "VYz-SMTcYcg", title: "German Colors", duration: 300, level: "A1", topic: "Renkler" },
  { id: "vWJnGI2DkXc", title: "German Weather Vocabulary", duration: 420, level: "A1", topic: "Hava Durumu" },

  // Easy German Street Interviews (A2-B1)
  { id: "7IaB_1ZdlFE", title: "What Do Germans Think About Their Country?", duration: 780, level: "A2", topic: "Kultur" },
  { id: "uLCaWQpaeWU", title: "What Germans Do on Weekends", duration: 660, level: "A2", topic: "Hafta Sonu" },
  { id: "oH_e-0qht2M", title: "German Food Favorites", duration: 720, level: "A2", topic: "Yemek" },
  { id: "lfgr0R-KKMA", title: "What Makes Germans Happy?", duration: 600, level: "A2", topic: "Mutluluk" },
  { id: "HYCFSuaHkJE", title: "How Germans Celebrate Christmas", duration: 840, level: "A2", topic: "Noel" },
  { id: "rUfkxJSm26E", title: "German Habits That Foreigners Find Strange", duration: 780, level: "A2", topic: "Kultur Farklari" },
  { id: "4aY9cO-3abY", title: "How Expensive Is Life in Germany?", duration: 900, level: "A2", topic: "Yasam Maliyeti" },
  { id: "8Z5GRPeVU5s", title: "What Do Germans Think About Foreigners?", duration: 720, level: "A2", topic: "Entegrasyon" },
  { id: "8aY7BO9aUZc", title: "German Slang Words You Need to Know", duration: 660, level: "A2", topic: "Argo" },
  { id: "gGoMBwfusr4", title: "Public Transport in Germany", duration: 540, level: "A2", topic: "Ulasim" },

  // Grammar & Vocabulary (B1)
  { id: "RHKaBiKb2sE", title: "German Cases Explained Simply", duration: 900, level: "B1", topic: "Gramer - Haller" },
  { id: "2xFqxwB6M_k", title: "Separable Verbs in German", duration: 720, level: "B1", topic: "Gramer - Fiiller" },
  { id: "Df-FToivDos", title: "German Dativ Prepositions", duration: 600, level: "B1", topic: "Gramer - Edatlar" },
  { id: "9eFaYaQhMKs", title: "When to Use Sein vs Haben", duration: 540, level: "B1", topic: "Gramer - Yardimci Fiiller" },
  { id: "qT58pUrcfQs", title: "German Word Order Rules", duration: 660, level: "B1", topic: "Gramer - Cumle Yapisi" },
  { id: "T_b4_ZPZiWI", title: "Konjunktiv II - Would & Could in German", duration: 780, level: "B1", topic: "Gramer - Konjunktiv" },
  { id: "NrMdS15RPQE", title: "German Relative Clauses", duration: 720, level: "B1", topic: "Gramer - Yan Cumleler" },
  { id: "LPINu7sPmQc", title: "Genitive Case in German", duration: 600, level: "B1", topic: "Gramer - Genitiv" },
  { id: "a4Qr-J3sXso", title: "Passive Voice in German", duration: 660, level: "B1", topic: "Gramer - Edilgen" },
  { id: "S3OXaprFFaM", title: "German Conjunctions That Change Word Order", duration: 540, level: "B1", topic: "Gramer - Baglaclar" },

  // Culture & Daily Life (B1-B2)
  { id: "p3a_ghqvEh4", title: "A Day in Berlin", duration: 1020, level: "B1", topic: "Sehir Hayati" },
  { id: "vG5MMe7FDXY", title: "German Work Culture Explained", duration: 840, level: "B1", topic: "Is Hayati" },
  { id: "yJCQw_Ll0YU", title: "The German Education System", duration: 900, level: "B1", topic: "Egitim" },
  { id: "k6eY0btUPfE", title: "Renting an Apartment in Germany", duration: 960, level: "B1", topic: "Ev Kiralama" },
  { id: "rxijjhrEQh4", title: "German Healthcare System", duration: 780, level: "B1", topic: "Saglik Sistemi" },
  { id: "nUJlxuh7oOQ", title: "Recycling in Germany", duration: 600, level: "B1", topic: "Geri Donusum" },
  { id: "ckyq1gBFXwU", title: "How to Open a Bank Account in Germany", duration: 720, level: "B1", topic: "Banka" },
  { id: "5_YD0jxhJLQ", title: "German Dialects Explained", duration: 840, level: "B2", topic: "Lehceler" },
  { id: "kX0InupCRnw", title: "Regional Differences in Germany", duration: 780, level: "B2", topic: "Bolgesel Farklar" },
  { id: "1hZwf5_XRN0", title: "German Humor and Comedy", duration: 720, level: "B2", topic: "Almanya'da Mizah" },
];

export const EASY_GERMAN_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export const EASY_GERMAN_TOPICS = Array.from(
  new Set(EASY_GERMAN_VIDEOS.map((v) => v.topic))
);
