import { describe, it, expect } from "vitest";
import {
  calculateNextReview,
  getDueCards,
  formatInterval,
  getEstimatedIntervals,
  type SRSCard,
} from "./srs";
import { DEFAULT_SRS_SETTINGS, type SRSSettings } from "./srs-settings";

const S = DEFAULT_SRS_SETTINGS;

// --- calculateNextReview ---

describe("calculateNextReview", () => {
  const freshCard: SRSCard = {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    lapses: 0,
    learningStep: 0,
  };

  const learningCard: SRSCard = {
    interval: 1,
    repetitions: 1,
    easeFactor: 2.5,
    lapses: 0,
    learningStep: 0,
  };

  const matureCard: SRSCard = {
    interval: 30,
    repetitions: 5,
    easeFactor: 2.5,
    lapses: 0,
    learningStep: 0,
  };

  // --- "again" rating ---
  describe('rating: "again"', () => {
    it("should reset repetitions and set RELEARN status", () => {
      const result = calculateNextReview(freshCard, "again", S);
      expect(result.repetitions).toBe(0);
      expect(result.status).toBe("RELEARN");
      expect(result.lapses).toBe(1);
    });

    it("should decrease ease factor but not below 1.3", () => {
      const result = calculateNextReview(freshCard, "again", S);
      expect(result.easeFactor).toBe(2.3);

      const lowEaseCard: SRSCard = { ...freshCard, easeFactor: 1.3 };
      const result2 = calculateNextReview(lowEaseCard, "again", S);
      expect(result2.easeFactor).toBe(1.3);
    });

    it("should set dueDate using relearningSteps", () => {
      const before = Date.now();
      const result = calculateNextReview(freshCard, "again", S);
      const after = Date.now();

      const dueDateMs = result.dueDate.getTime();
      // relearningSteps[0] = 10 min = 600_000 ms
      expect(dueDateMs).toBeGreaterThanOrEqual(before + 600_000 - 5000);
      expect(dueDateMs).toBeLessThanOrEqual(after + 600_000 + 5000);
    });

    it("should increment lapses for mature card", () => {
      const result = calculateNextReview(matureCard, "again", S);
      expect(result.lapses).toBe(1);
      expect(result.repetitions).toBe(0);
    });
  });

  // --- "good" rating ---
  describe('rating: "good"', () => {
    it("should advance learning step for first good (step 0 -> step 1)", () => {
      const result = calculateNextReview(freshCard, "good", S);
      // learningSteps = [1, 10], step 0 -> step 1 (10dk sonra)
      expect(result.learningStep).toBe(1);
      expect(result.status).toBe("LEARNING");
      expect(result.repetitions).toBe(0);
    });

    it("should graduate after last learning step", () => {
      const cardAtStep1: SRSCard = { ...freshCard, learningStep: 1 };
      const result = calculateNextReview(cardAtStep1, "good", S);
      // step 1 is the last step (index 1 of [1,10]), so should graduate
      expect(result.status).toBe("REVIEW");
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(S.graduatingInterval); // 1
    });

    it("should multiply interval by easeFactor for mature cards", () => {
      const result = calculateNextReview(matureCard, "good", S);
      // 30 * 2.5 * 1.0 (intervalModifier) = 75
      expect(result.interval).toBe(75);
      expect(result.status).toBe("REVIEW");
    });

    it("should update ease factor correctly for review", () => {
      // quality=4 for "good": EF + (0.1 - (5-4)*(0.08 + (5-4)*0.02)) = 2.5 + 0 = 2.5
      const result = calculateNextReview(matureCard, "good", S);
      expect(result.easeFactor).toBe(2.5);
    });
  });

  // --- "hard" rating ---
  describe('rating: "hard"', () => {
    it("should keep same learning step with longer delay", () => {
      const result = calculateNextReview(freshCard, "hard", S);
      // learningSteps[0]=1, hardModifier=1.2, so 1*1.2 = ~1 min
      expect(result.learningStep).toBe(0);
      expect(result.status).toBe("LEARNING");
    });

    it("should apply hardModifier for review cards", () => {
      const result = calculateNextReview(matureCard, "hard", S);
      // quality=3: EF update, then interval = interval * EF * intervalModifier * (hardModifier/EF)
      expect(result.interval).toBeGreaterThan(0);
      expect(result.status).toBe("REVIEW");
    });

    it("should decrease ease factor for review cards", () => {
      const result = calculateNextReview(matureCard, "hard", S);
      expect(result.easeFactor).toBeLessThan(2.5);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  // --- "easy" rating ---
  describe('rating: "easy"', () => {
    it("should immediately graduate learning card", () => {
      const result = calculateNextReview(freshCard, "easy", S);
      expect(result.status).toBe("REVIEW");
      expect(result.interval).toBe(S.easyInterval); // 4
      expect(result.repetitions).toBe(1);
    });

    it("should apply easyBonus for review cards", () => {
      const result = calculateNextReview(matureCard, "easy", S);
      // quality=5: EF = 2.5 + 0.1 = 2.6
      // interval = round(30 * 2.6 * 1.0) = 78, then * 1.3 = round(101.4) = 101
      const expectedEF = 2.6;
      const baseInterval = Math.round(30 * expectedEF * S.intervalModifier);
      const easyInterval = Math.round(baseInterval * S.easyBonus);
      expect(result.interval).toBe(easyInterval);
    });

    it("should increase ease factor", () => {
      const result = calculateNextReview(matureCard, "easy", S);
      expect(result.easeFactor).toBeCloseTo(2.6, 2);
    });
  });

  // --- Custom settings ---
  describe("custom settings", () => {
    it("should respect custom learning steps", () => {
      const custom: SRSSettings = { ...S, learningSteps: [1, 5, 15] };
      const r1 = calculateNextReview({ ...freshCard, learningStep: 0 }, "good", custom);
      expect(r1.learningStep).toBe(1);
      expect(r1.status).toBe("LEARNING");

      const r2 = calculateNextReview({ ...freshCard, learningStep: 1 }, "good", custom);
      expect(r2.learningStep).toBe(2);
      expect(r2.status).toBe("LEARNING");

      const r3 = calculateNextReview({ ...freshCard, learningStep: 2 }, "good", custom);
      expect(r3.status).toBe("REVIEW"); // graduated
    });

    it("should respect maxInterval", () => {
      const custom: SRSSettings = { ...S, maxInterval: 60 };
      const bigCard: SRSCard = { interval: 50, repetitions: 10, easeFactor: 3.0, lapses: 0, learningStep: 0 };
      const result = calculateNextReview(bigCard, "good", custom);
      expect(result.interval).toBeLessThanOrEqual(60);
    });

    it("should respect custom graduatingInterval", () => {
      const custom: SRSSettings = { ...S, graduatingInterval: 3, learningSteps: [1] };
      const card: SRSCard = { ...freshCard, learningStep: 0 };
      const result = calculateNextReview(card, "good", custom);
      expect(result.interval).toBe(3);
      expect(result.status).toBe("REVIEW");
    });

    it("should respect custom easyInterval", () => {
      const custom: SRSSettings = { ...S, easyInterval: 7 };
      const result = calculateNextReview(freshCard, "easy", custom);
      expect(result.interval).toBe(7);
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
        learningStep: 0,
      };
      const result = calculateNextReview(card, "good", S);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.interval).toBeGreaterThan(0);
    });

    it("should set dueDate in the future for successful reviews", () => {
      const now = new Date();
      const result = calculateNextReview(matureCard, "good", S);
      expect(result.dueDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should accumulate lapses on repeated failures", () => {
      let card: SRSCard = { ...matureCard };
      for (let i = 0; i < 3; i++) {
        const result = calculateNextReview(card, "again", S);
        card = {
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          lapses: result.lapses,
          learningStep: result.learningStep,
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
  });

  it("should return years for >= 365", () => {
    expect(formatInterval(365)).toBe("1.0 yıl");
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
      learningStep: 0,
    };
    const intervals = getEstimatedIntervals(card, S);
    expect(intervals).toHaveProperty("again");
    expect(intervals).toHaveProperty("hard");
    expect(intervals).toHaveProperty("good");
    expect(intervals).toHaveProperty("easy");
    expect(typeof intervals.good).toBe("string");
  });

  it("should show learning step times for new cards", () => {
    const card: SRSCard = {
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      lapses: 0,
      learningStep: 0,
    };
    const intervals = getEstimatedIntervals(card, S);
    expect(intervals.good).toBe("10dk"); // next step (step 1 = 10min)
    expect(intervals.easy).toBe("4g"); // easyInterval
  });
});
