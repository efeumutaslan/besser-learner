/**
 * Deste istatistik hesaplarini merkezilestiren utility.
 * 3 ayri route'ta (desteler, desteler/[id], calisma/[deckId]) tekrarlanan mantik.
 */

interface CardForStats {
  id: string;
  status: string;
  dueDate: Date | string;
  interval?: number;
}

/** Basit deste istatistikleri (gunluk limit olmadan) — deste listesi icin */
export function calculateSimpleStats(cards: CardForStats[]) {
  const now = new Date();
  const newCount = cards.filter((c) => c.status === "NEW").length;
  const learningCount = cards.filter(
    (c) =>
      (c.status === "LEARNING" || c.status === "RELEARN") &&
      new Date(c.dueDate) <= now
  ).length;
  const reviewCount = cards.filter(
    (c) => c.status === "REVIEW" && new Date(c.dueDate) <= now
  ).length;

  return {
    newCount,
    learningCount,
    reviewCount,
    dueCount: learningCount + reviewCount,
  };
}

/** Gunluk limitli deste istatistikleri — deste detay ve calisma kuyrugu icin */
export function calculateDailyLimitedStats(
  cards: CardForStats[],
  todayReviewedCardIds: Set<string>,
  todayNewStarted: number,
  newPerDay: number,
  reviewPerDay: number
) {
  const now = new Date();

  const remainingNew = Math.max(0, newPerDay - todayNewStarted);
  const remainingReview = Math.max(0, reviewPerDay - todayReviewedCardIds.size);

  const learningDueCount = cards.filter(
    (c) =>
      (c.status === "LEARNING" || c.status === "RELEARN") &&
      new Date(c.dueDate) <= now
  ).length;

  const reviewDueCards = cards.filter(
    (c) =>
      c.status === "REVIEW" &&
      new Date(c.dueDate) <= now &&
      !todayReviewedCardIds.has(c.id)
  );
  const reviewDueCount = Math.min(reviewDueCards.length, remainingReview);

  const newCount = Math.min(
    cards.filter((c) => c.status === "NEW").length,
    remainingNew
  );

  const matureCount = cards.filter(
    (c) => c.status === "REVIEW" && (c.interval ?? 0) >= 21
  ).length;

  return {
    newCount,
    learningDueCount,
    reviewDueCount,
    matureCount,
    remainingNew,
    remainingReview,
  };
}
