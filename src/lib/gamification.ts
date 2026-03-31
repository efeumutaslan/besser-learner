/**
 * Gamification Engine
 * XP, Gem, Streak ve Mastery hesaplamaları
 */

// XP Kazanım Tablosu
export const XP_REWARDS = {
  // SRS tekrar
  REVIEW_CORRECT: 10,
  REVIEW_WRONG: 2,
  // Öğren modu
  LEARN_CORRECT: 5,
  LEARN_WRONG: 1,
  LEARN_ROUND_COMPLETE: 20,
  LEARN_ALL_MASTERED: 50,
  // Test modu
  TEST_CORRECT: 5,
  TEST_COMPLETE: 30,
  TEST_PERFECT: 50, // %100 doğru
  // Eşleştir
  MATCH_COMPLETE: 25,
  MATCH_NO_MISTAKES: 40,
  // Blast
  BLAST_POINT: 3,
  BLAST_COMPLETE: 30,
  // Streak bonusları
  STREAK_3: 15,
  STREAK_7: 30,
  STREAK_30: 100,
} as const;

// Gem kazanım
export const GEM_REWARDS = {
  LESSON_COMPLETE: 5,
  PERFECT_SCORE: 10,
  STREAK_7: 20,
  STREAK_30: 50,
  FIRST_REVIEW: 10,
} as const;

// Mastery Seviyeleri (Quizlet tarzı)
export type MasteryLevel = "NEW" | "SEEN" | "FAMILIAR" | "MASTERED";

export function getNextMastery(
  currentMastery: MasteryLevel,
  isCorrect: boolean,
  correctHits: number
): { mastery: MasteryLevel; correctHits: number } {
  if (!isCorrect) {
    // Yanlış cevap: bir seviye geri düş (minimum SEEN)
    if (currentMastery === "MASTERED") {
      return { mastery: "FAMILIAR", correctHits: 1 };
    }
    if (currentMastery === "FAMILIAR") {
      return { mastery: "SEEN", correctHits: 0 };
    }
    return { mastery: "SEEN", correctHits: 0 };
  }

  // Doğru cevap
  const newHits = correctHits + 1;

  if (newHits >= 2) {
    return { mastery: "MASTERED", correctHits: newHits };
  }
  if (newHits >= 1) {
    return { mastery: "FAMILIAR", correctHits: newHits };
  }
  return { mastery: "SEEN", correctHits: newHits };
}

// Streak hesaplama
export function calculateStreak(
  lastStudyDate: string | null,
  currentStreak: number
): { newStreak: number; isNewDay: boolean; streakBroken: boolean } {
  const today = getTodayStr();

  if (!lastStudyDate) {
    return { newStreak: 1, isNewDay: true, streakBroken: false };
  }

  if (lastStudyDate === today) {
    // Bugün zaten çalışılmış
    return { newStreak: currentStreak, isNewDay: false, streakBroken: false };
  }

  const yesterday = getYesterdayStr();
  if (lastStudyDate === yesterday) {
    // Dün çalışılmış - streak devam
    return { newStreak: currentStreak + 1, isNewDay: true, streakBroken: false };
  }

  // Streak kırıldı
  return { newStreak: 1, isNewDay: true, streakBroken: true };
}

// Oturum XP hesapla
export function calculateSessionXP(params: {
  type: "review" | "learn" | "test" | "match" | "blast";
  correctCount: number;
  wrongCount: number;
  totalCards: number;
  isPerfect: boolean;
  noMistakes?: boolean;
}): { xp: number; gems: number } {
  let xp = 0;
  let gems = GEM_REWARDS.LESSON_COMPLETE;

  switch (params.type) {
    case "review":
      xp =
        params.correctCount * XP_REWARDS.REVIEW_CORRECT +
        params.wrongCount * XP_REWARDS.REVIEW_WRONG;
      break;
    case "learn":
      xp =
        params.correctCount * XP_REWARDS.LEARN_CORRECT +
        params.wrongCount * XP_REWARDS.LEARN_WRONG +
        XP_REWARDS.LEARN_ROUND_COMPLETE;
      if (params.isPerfect) xp += XP_REWARDS.LEARN_ALL_MASTERED;
      break;
    case "test":
      xp =
        params.correctCount * XP_REWARDS.TEST_CORRECT +
        XP_REWARDS.TEST_COMPLETE;
      if (params.isPerfect) xp += XP_REWARDS.TEST_PERFECT;
      break;
    case "match":
      xp = XP_REWARDS.MATCH_COMPLETE;
      if (params.noMistakes) xp += XP_REWARDS.MATCH_NO_MISTAKES;
      break;
    case "blast":
      xp =
        params.correctCount * XP_REWARDS.BLAST_POINT +
        XP_REWARDS.BLAST_COMPLETE;
      break;
  }

  if (params.isPerfect) {
    gems += GEM_REWARDS.PERFECT_SCORE;
  }

  return { xp, gems };
}

// Streak bonus XP
export function getStreakBonus(streak: number): number {
  if (streak >= 30) return XP_REWARDS.STREAK_30;
  if (streak >= 7) return XP_REWARDS.STREAK_7;
  if (streak >= 3) return XP_REWARDS.STREAK_3;
  return 0;
}

// Yardımcı tarih fonksiyonları
export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Son 7 günün tarihlerini oluştur (streak takvimi için)
export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return days;
}

// Gün adı (kısa)
export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { weekday: "short" });
}
