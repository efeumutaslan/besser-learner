/**
 * SM-2 Spaced Repetition Algorithm
 * Anki'nin kullandığı algoritmanın birebir implementasyonu
 *
 * Kalite puanları:
 * 0 - Hiç hatırlamadım
 * 1 - Yanlış, ama doğru cevabı görünce hatırladım
 * 2 - Yanlış, ama doğru cevap kolay hatırlandı
 * 3 - Doğru, ama çok zorlandım
 * 4 - Doğru, biraz düşündüm
 * 5 - Doğru, çok kolaydı
 */

export interface SRSCard {
  interval: number;
  repetitions: number;
  easeFactor: number;
  lapses: number;
}

export interface SRSResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: Date;
  status: "NEW" | "LEARNING" | "REVIEW" | "RELEARN";
  lapses: number;
}

// Anki'nin kullandığı kalite butonları
export type AnkiRating = "again" | "hard" | "good" | "easy";

// Rating'i SM-2 kalite puanına çevir
function ratingToQuality(rating: AnkiRating): number {
  switch (rating) {
    case "again":
      return 0;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

export function calculateNextReview(
  card: SRSCard,
  rating: AnkiRating
): SRSResult {
  const quality = ratingToQuality(rating);
  let { interval, repetitions, easeFactor, lapses } = card;

  if (quality < 3) {
    // Başarısız - kartı sıfırla
    repetitions = 0;
    interval = 0;
    lapses = lapses + 1;

    return {
      interval: 1, // 1 gün sonra tekrar göster (yeni öğrenme)
      repetitions: 0,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      dueDate: addMinutes(new Date(), 10), // 10 dakika sonra tekrar
      status: "RELEARN",
      lapses,
    };
  }

  // Başarılı cevap
  // Ease Factor güncelle
  const newEF =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, newEF);

  // Interval hesapla
  if (repetitions === 0) {
    interval = 1;
  } else if (repetitions === 1) {
    interval = 6;
  } else {
    interval = Math.round(interval * easeFactor);
  }

  // Hard seçildiyse interval'i biraz azalt
  if (rating === "hard") {
    interval = Math.max(1, Math.round(interval * 0.8));
  }

  // Easy seçildiyse interval'i artır
  if (rating === "easy") {
    interval = Math.round(interval * 1.3);
  }

  repetitions = repetitions + 1;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  dueDate.setHours(0, 0, 0, 0);

  return {
    interval,
    repetitions,
    easeFactor,
    dueDate,
    status: repetitions <= 1 ? "LEARNING" : "REVIEW",
    lapses,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Bir deste için bugün çalışılacak kartları hesapla
export function getDueCards(params: {
  newPerDay: number;
  reviewPerDay: number;
  totalNewToday: number;
  totalReviewToday: number;
}) {
  const remainingNew = Math.max(0, params.newPerDay - params.totalNewToday);
  const remainingReview = Math.max(
    0,
    params.reviewPerDay - params.totalReviewToday
  );

  return { remainingNew, remainingReview };
}

// Sonraki tekrar için okunabilir süre
export function formatInterval(interval: number): string {
  if (interval === 0) return "Şimdi";
  if (interval === 1) return "1 gün";
  if (interval < 30) return `${interval} gün`;
  if (interval < 365) {
    const months = Math.round(interval / 30);
    return `${months} ay`;
  }
  const years = (interval / 365).toFixed(1);
  return `${years} yıl`;
}

// Tahmini sonraki tekrar aralıkları (butonlarda gösterilecek)
export function getEstimatedIntervals(card: SRSCard): Record<AnkiRating, string> {
  return {
    again: "10dk",
    hard: formatInterval(
      calculateNextReview(card, "hard").interval
    ),
    good: formatInterval(
      calculateNextReview(card, "good").interval
    ),
    easy: formatInterval(
      calculateNextReview(card, "easy").interval
    ),
  };
}
