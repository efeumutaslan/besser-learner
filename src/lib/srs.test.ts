import { describe, it, expect } from "vitest";
import {
  calculateNextReview,
  getDueCards,
  formatInterval,
  getEstimatedIntervals,
  type SRSCard,
} from "./srs";

// --- calculateNextReview ---

describe("calculateNextReview", () => {
  const freshCard: SRSCard = {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    lapses: 0,
  };

  const learningCard: SRSCard = {
    interval: 1,
    repetitions: 1,
    easeFactor: 2.5,
    lapses: 0,
  };

  const matureCard: SRSCard = {
    interval: 30,
    repetitions: 5,
    easeFactor: 2.5,
    lapses: 0,
  };

  // --- "again" rating ---
  describe('rating: "again"', () => {
    it("should reset repetitions and set RELEARN status", () => {
      const result = calculateNextReview(freshCard, "again");
      expect(result.repetitions).toBe(0);
      expect(result.status).toBe("RELEARN");
      expect(result.lapses).toBe(1);
    });

    it("should decrease ease factor but not below 1.3", () => {
      const result = calculateNextReview(freshCard, "again");
      expect(result.easeFactor).toBe(2.3); // 2.5 - 0.2

      const lowEaseCard: SRSCard = { ...freshCard, easeFactor: 1.3 };
      const result2 = calculateNextReview(lowEaseCard, "again");
      expect(result2.easeFactor).toBe(1.3); // min 1.3
    });

    it("should set dueDate ~10 minutes from now", () => {
      const before = Date.now();
      const result = calculateNextReview(freshCard, "again");
      const after = Date.now();

      const dueDateMs = result.dueDate.getTime();
      // 10 minutes = 600_000 ms, allow 5s tolerance
      expect(dueDateMs).toBeGreaterThanOrEqual(before + 600_000 - 5000);
      expect(dueDateMs).toBeLessThanOrEqual(after + 600_000 + 5000);
    });

    it("should increment lapses for mature card", () => {
      const result = calculateNextReview(matureCard, "again");
      expect(result.lapses).toBe(1);
      expect(result.repetitions).toBe(0);
    });
  });

  // --- "good" rating ---
  describe('rating: "good"', () => {
    it("should set interval=1 for first review (rep=0)", () => {
      const result = calculateNextReview(freshCard, "good");
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.status).toBe("LEARNING");
    });

    it("should set interval=6 for second review (rep=1)", () => {
      const result = calculateNextReview(learningCard, "good");
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
      expect(result.status).toBe("REVIEW");
    });

    it("should multiply interval by easeFactor for mature cards", () => {
      const result = calculateNextReview(matureCard, "good");
      // 30 * 2.5 = 75, rounded
      expect(result.interval).toBe(75);
      expect(result.status).toBe("REVIEW");
    });

    it("should update ease factor correctly", () => {
      // quality=4 for "good": EF + (0.1 - (5-4)*(0.08 + (5-4)*0.02))
      // = 2.5 + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
      const result = calculateNextReview(freshCard, "good");
      expect(result.easeFactor).toBe(2.5);
    });

    it("should not produce lapses", () => {
      const result = calculateNextReview(freshCard, "good");
      expect(result.lapses).toBe(0);
    });
  });

  // --- "hard" rating ---
  describe('rating: "hard"', () => {
    it("should reduce interval by 0.8x", () => {
      const result = calculateNextReview(matureCard, "hard");
      // quality=3: EF = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
      // interval = round(30 * 2.36) = 71, then * 0.8 = round(56.8) = 57
      // But order: first calculate interval then apply hard modifier
      const expectedEF = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02));
      const baseInterval = Math.round(30 * expectedEF);
      const hardInterval = Math.max(1, Math.round(baseInterval * 0.8));
      expect(result.interval).toBe(hardInterval);
    });

    it("should decrease ease factor", () => {
      const result = calculateNextReview(freshCard, "hard");
      // quality=3: EF = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.36
      expect(result.easeFactor).toBeCloseTo(2.36, 2);
    });
  });

  // --- "easy" rating ---
  describe('rating: "easy"', () => {
    it("should multiply interval by 1.3x bonus", () => {
      const result = calculateNextReview(matureCard, "easy");
      // quality=5: EF = 2.5 + (0.1 - 0) = 2.6
      // interval = round(30 * 2.6) = 78, then * 1.3 = round(101.4) = 101
      const expectedEF = 2.6;
      const baseInterval = Math.round(30 * expectedEF);
      const easyInterval = Math.round(baseInterval * 1.3);
      expect(result.interval).toBe(easyInterval);
    });

    it("should increase ease factor", () => {
      const result = calculateNextReview(freshCard, "easy");
      // quality=5: EF = 2.5 + 0.1 = 2.6
      expect(result.easeFactor).toBeCloseTo(2.6, 2);
    });
  });

  // --- Edge cases ---
  describe("edge cases", () => {
    it("should handle very low ease factor", () => {
      const card: SRSCard = {
        interval: 10,
        repetitions: 3,
        easeFactor: 1.3,
        lapses: 5,
      };
      const result = calculateNextReview(card, "good");
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.interval).toBeGreaterThan(0);
    });

    it("should handle zero interval card with good", () => {
      const card: SRSCard = {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        lapses: 0,
      };
      const result = calculateNextReview(card, "good");
      expect(result.interval).toBe(1);
    });

    it("should set dueDate in the future for successful reviews", () => {
      const now = new Date();
      const result = calculateNextReview(matureCard, "good");
      expect(result.dueDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should accumulate lapses on repeated failures", () => {
      let card: SRSCard = { ...matureCard };
      for (let i = 0; i < 3; i++) {
        const result = calculateNextReview(card, "again");
        card = {
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          lapses: result.lapses,
        };
      }
      expect(card.lapses).toBe(3);
    });
  });
});

// --- getDueCards ---

describe("getDueCards", () => {
  it("should return remaining new and review counts", () => {
    const result = getDueCards({
      newPerDay: 20,
      reviewPerDay: 200,
      totalNewToday: 5,
      totalReviewToday: 50,
    });
    expect(result.remainingNew).toBe(15);
    expect(result.remainingReview).toBe(150);
  });

  it("should not return negative values", () => {
    const result = getDueCards({
      newPerDay: 10,
      reviewPerDay: 100,
      totalNewToday: 15,
      totalReviewToday: 120,
    });
    expect(result.remainingNew).toBe(0);
    expect(result.remainingReview).toBe(0);
  });

  it("should handle zero limits", () => {
    const result = getDueCards({
      newPerDay: 0,
      reviewPerDay: 0,
      totalNewToday: 0,
      totalReviewToday: 0,
    });
    expect(result.remainingNew).toBe(0);
    expect(result.remainingReview).toBe(0);
  });
});

// --- formatInterval ---

describe("formatInterval", () => {
  it('should return "Simdi" for 0', () => {
    expect(formatInterval(0)).toBe("Şimdi");
  });

  it('should return "1 gun" for 1', () => {
    expect(formatInterval(1)).toBe("1 gün");
  });

  it("should return days for < 30", () => {
    expect(formatInterval(15)).toBe("15 gün");
  });

  it("should return months for 30-364", () => {
    expect(formatInterval(60)).toBe("2 ay");
    expect(formatInterval(90)).toBe("3 ay");
  });

  it("should return years for >= 365", () => {
    expect(formatInterval(365)).toBe("1.0 yıl");
    expect(formatInterval(730)).toBe("2.0 yıl");
  });
});

// --- getEstimatedIntervals ---

describe("getEstimatedIntervals", () => {
  it("should return interval strings for all ratings", () => {
    const card: SRSCard = {
      interval: 10,
      repetitions: 3,
      easeFactor: 2.5,
      lapses: 0,
    };
    const intervals = getEstimatedIntervals(card);
    expect(intervals).toHaveProperty("again");
    expect(intervals).toHaveProperty("hard");
    expect(intervals).toHaveProperty("good");
    expect(intervals).toHaveProperty("easy");
    expect(intervals.again).toBe("10dk");
    expect(typeof intervals.good).toBe("string");
  });
});
