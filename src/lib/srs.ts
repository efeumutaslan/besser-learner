/**
 * SM-2 Spaced Repetition Algorithm
 * Anki'nin kullandigi algoritmanin ayarlanabilir implementasyonu
 *
 * Kalite puanlari:
 * 0 - Hic hatirlamadim
 * 1 - Yanlis, ama dogru cevabi gorunce hatirladim
 * 2 - Yanlis, ama dogru cevap kolay hatirlandi
 * 3 - Dogru, ama cok zorlandim
 * 4 - Dogru, biraz dusundum
 * 5 - Dogru, cok kolaydi
 */

import { type SRSSettings, DEFAULT_SRS_SETTINGS } from "./srs-settings";

export interface SRSCard {
  interval: number;
  repetitions: number;
  easeFactor: number;
  lapses: number;
  learningStep?: number; // cok adimli ogrenme indeksi
}

export interface SRSResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: Date;
  status: "NEW" | "LEARNING" | "REVIEW" | "RELEARN";
  lapses: number;
  learningStep: number;
}

// Anki'nin kullandigi kalite butonlari
export type AnkiRating = "again" | "hard" | "good" | "easy";

// Rating'i SM-2 kalite puanina cevir
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
  rating: AnkiRating,
  settings: SRSSettings = DEFAULT_SRS_SETTINGS
): SRSResult {
  const quality = ratingToQuality(rating);
  let { interval, repetitions, easeFactor, lapses } = card;
  const learningStep = card.learningStep ?? 0;

  // --- AGAIN: basarisiz ---
  if (quality < 3) {
    lapses = lapses + 1;

    // Relearning adimlari
    const reSteps = settings.relearningSteps;
    const reStepMinutes = reSteps.length > 0 ? reSteps[0] : 10;

    return {
      interval: Math.max(settings.lapseMinInterval, 1),
      repetitions: 0,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      dueDate: addMinutes(new Date(), reStepMinutes),
      status: "RELEARN",
      lapses,
      learningStep: 0,
    };
  }

  // --- LEARNING / ilk adimlar (rep=0) ---
  if (repetitions === 0) {
    const steps = settings.learningSteps;

    if (rating === "easy") {
      // Easy -> direkt mezun, easyInterval gun sonra
      return {
        interval: settings.easyInterval,
        repetitions: 1,
        easeFactor: Math.max(1.3, settings.startingEase),
        dueDate: addDays(new Date(), settings.easyInterval),
        status: "REVIEW",
        lapses,
        learningStep: steps.length,
      };
    }

    if (rating === "good") {
      const nextStep = learningStep + 1;

      if (nextStep >= steps.length) {
        // Son adimi gec -> mezuniyet
        return {
          interval: settings.graduatingInterval,
          repetitions: 1,
          easeFactor: Math.max(1.3, settings.startingEase),
          dueDate: addDays(new Date(), settings.graduatingInterval),
          status: "REVIEW",
          lapses,
          learningStep: steps.length,
        };
      }

      // Bir sonraki ogrenme adimi
      const nextMinutes = steps[nextStep];
      return {
        interval: 0,
        repetitions: 0,
        easeFactor: Math.max(1.3, settings.startingEase),
        dueDate: addMinutes(new Date(), nextMinutes),
        status: "LEARNING",
        lapses,
        learningStep: nextStep,
      };
    }

    // Hard -> ayni adimda kal, suresi 1.2x
    const currentMinutes = steps[learningStep] ?? 1;
    const hardMinutes = Math.round(currentMinutes * settings.hardModifier);
    return {
      interval: 0,
      repetitions: 0,
      easeFactor: Math.max(1.3, settings.startingEase),
      dueDate: addMinutes(new Date(), hardMinutes),
      status: "LEARNING",
      lapses,
      learningStep: learningStep,
    };
  }

  // --- REVIEW: olgun kart (rep >= 1) ---

  // Ease Factor guncelle (SM-2 formulu)
  const newEF =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, newEF);

  // Interval hesapla
  if (repetitions === 1) {
    interval = settings.graduatingInterval;
  } else {
    interval = Math.round(interval * easeFactor * settings.intervalModifier);
  }

  // Hard -> interval * hardModifier (0.8x yerine settings'ten)
  if (rating === "hard") {
    // Anki'de hard icin: interval * 1.2 * intervalModifier ama ease dusurulur
    // Biz burada hardModifier / easeFactor oranini kullaniyoruz
    interval = Math.max(1, Math.round(interval * (settings.hardModifier / easeFactor)));
  }

  // Easy -> interval * easyBonus
  if (rating === "easy") {
    interval = Math.round(interval * settings.easyBonus);
  }

  // maxInterval sinirlama
  interval = Math.min(interval, settings.maxInterval);
  interval = Math.max(1, interval);

  repetitions = repetitions + 1;

  return {
    interval,
    repetitions,
    easeFactor,
    dueDate: addDays(new Date(), interval),
    status: "REVIEW",
    lapses,
    learningStep: 0,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Bir deste icin bugun calisilacak kartlari hesapla
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

// Sonraki tekrar icin okunabilir sure
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

// Tahmini sonraki tekrar araliklari (butonlarda gosterilecek)
export function getEstimatedIntervals(
  card: SRSCard,
  settings: SRSSettings = DEFAULT_SRS_SETTINGS
): Record<AnkiRating, string> {
  const steps = card.repetitions === 0 ? settings.learningSteps : [];
  const currentStep = card.learningStep ?? 0;

  return {
    again:
      settings.relearningSteps.length > 0
        ? `${settings.relearningSteps[0]}dk`
        : "10dk",
    hard:
      card.repetitions === 0
        ? `${Math.round((steps[currentStep] ?? 1) * settings.hardModifier)}dk`
        : formatInterval(calculateNextReview(card, "hard", settings).interval),
    good:
      card.repetitions === 0 && currentStep + 1 < steps.length
        ? `${steps[currentStep + 1]}dk`
        : card.repetitions === 0
        ? `${settings.graduatingInterval}g`
        : formatInterval(calculateNextReview(card, "good", settings).interval),
    easy:
      card.repetitions === 0
        ? `${settings.easyInterval}g`
        : formatInterval(calculateNextReview(card, "easy", settings).interval),
  };
}
