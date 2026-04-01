import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getNextMastery,
  calculateStreak,
  calculateSessionXP,
  getStreakBonus,
  XP_REWARDS,
  GEM_REWARDS,
  type MasteryLevel,
} from "./gamification";

// --- getNextMastery ---

describe("getNextMastery", () => {
  describe("correct answers", () => {
    it("NEW + correct (1 hit) -> FAMILIAR", () => {
      const result = getNextMastery("NEW", true, 0);
      expect(result.mastery).toBe("FAMILIAR");
      expect(result.correctHits).toBe(1);
    });

    it("SEEN + correct (1 hit) -> FAMILIAR", () => {
      const result = getNextMastery("SEEN", true, 0);
      expect(result.mastery).toBe("FAMILIAR");
      expect(result.correctHits).toBe(1);
    });

    it("FAMILIAR + correct (2 hits) -> MASTERED", () => {
      const result = getNextMastery("FAMILIAR", true, 1);
      expect(result.mastery).toBe("MASTERED");
      expect(result.correctHits).toBe(2);
    });

    it("MASTERED + correct -> stays MASTERED", () => {
      const result = getNextMastery("MASTERED", true, 3);
      expect(result.mastery).toBe("MASTERED");
      expect(result.correctHits).toBe(4);
    });
  });

  describe("wrong answers", () => {
    it("MASTERED + wrong -> FAMILIAR", () => {
      const result = getNextMastery("MASTERED", false, 3);
      expect(result.mastery).toBe("FAMILIAR");
      expect(result.correctHits).toBe(1);
    });

    it("FAMILIAR + wrong -> SEEN", () => {
      const result = getNextMastery("FAMILIAR", false, 1);
      expect(result.mastery).toBe("SEEN");
      expect(result.correctHits).toBe(0);
    });

    it("SEEN + wrong -> stays SEEN", () => {
      const result = getNextMastery("SEEN", false, 0);
      expect(result.mastery).toBe("SEEN");
      expect(result.correctHits).toBe(0);
    });

    it("NEW + wrong -> SEEN", () => {
      const result = getNextMastery("NEW", false, 0);
      expect(result.mastery).toBe("SEEN");
      expect(result.correctHits).toBe(0);
    });
  });

  describe("mastery progression path", () => {
    it("should go NEW -> FAMILIAR -> MASTERED with consecutive correct answers", () => {
      let mastery: MasteryLevel = "NEW";
      let hits = 0;

      // 1st correct
      const r1 = getNextMastery(mastery, true, hits);
      mastery = r1.mastery;
      hits = r1.correctHits;
      expect(mastery).toBe("FAMILIAR");

      // 2nd correct
      const r2 = getNextMastery(mastery, true, hits);
      mastery = r2.mastery;
      hits = r2.correctHits;
      expect(mastery).toBe("MASTERED");
    });

    it("should recover from wrong answers", () => {
      // Start mastered, get wrong, recover
      let { mastery, correctHits } = getNextMastery("MASTERED", false, 5);
      expect(mastery).toBe("FAMILIAR");

      ({ mastery, correctHits } = getNextMastery(mastery, true, correctHits));
      expect(mastery).toBe("MASTERED");
    });
  });
});

// --- calculateStreak ---

describe("calculateStreak", () => {
  // Mock Date for predictable tests
  const FIXED_NOW = new Date("2026-04-01T12:00:00");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start streak at 1 for first study", () => {
    const result = calculateStreak(null, 0);
    expect(result.newStreak).toBe(1);
    expect(result.isNewDay).toBe(true);
    expect(result.streakBroken).toBe(false);
  });

  it("should not increment if already studied today", () => {
    const result = calculateStreak("2026-04-01", 5);
    expect(result.newStreak).toBe(5);
    expect(result.isNewDay).toBe(false);
    expect(result.streakBroken).toBe(false);
  });

  it("should increment if last studied yesterday", () => {
    const result = calculateStreak("2026-03-31", 5);
    expect(result.newStreak).toBe(6);
    expect(result.isNewDay).toBe(true);
    expect(result.streakBroken).toBe(false);
  });

  it("should break streak if missed a day", () => {
    const result = calculateStreak("2026-03-29", 10);
    expect(result.newStreak).toBe(1);
    expect(result.isNewDay).toBe(true);
    expect(result.streakBroken).toBe(true);
  });

  it("should break streak if missed many days", () => {
    const result = calculateStreak("2026-01-01", 50);
    expect(result.newStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });
});

// --- calculateSessionXP ---

describe("calculateSessionXP", () => {
  it("should calculate review XP", () => {
    const result = calculateSessionXP({
      type: "review",
      correctCount: 10,
      wrongCount: 2,
      totalCards: 12,
      isPerfect: false,
    });
    expect(result.xp).toBe(
      10 * XP_REWARDS.REVIEW_CORRECT + 2 * XP_REWARDS.REVIEW_WRONG
    );
    expect(result.gems).toBe(GEM_REWARDS.LESSON_COMPLETE);
  });

  it("should calculate learn XP with round complete bonus", () => {
    const result = calculateSessionXP({
      type: "learn",
      correctCount: 8,
      wrongCount: 2,
      totalCards: 10,
      isPerfect: false,
    });
    expect(result.xp).toBe(
      8 * XP_REWARDS.LEARN_CORRECT +
      2 * XP_REWARDS.LEARN_WRONG +
      XP_REWARDS.LEARN_ROUND_COMPLETE
    );
  });

  it("should add perfect bonus for learn", () => {
    const result = calculateSessionXP({
      type: "learn",
      correctCount: 10,
      wrongCount: 0,
      totalCards: 10,
      isPerfect: true,
    });
    expect(result.xp).toBe(
      10 * XP_REWARDS.LEARN_CORRECT +
      XP_REWARDS.LEARN_ROUND_COMPLETE +
      XP_REWARDS.LEARN_ALL_MASTERED
    );
    expect(result.gems).toBe(
      GEM_REWARDS.LESSON_COMPLETE + GEM_REWARDS.PERFECT_SCORE
    );
  });

  it("should calculate test XP", () => {
    const result = calculateSessionXP({
      type: "test",
      correctCount: 15,
      wrongCount: 5,
      totalCards: 20,
      isPerfect: false,
    });
    expect(result.xp).toBe(
      15 * XP_REWARDS.TEST_CORRECT + XP_REWARDS.TEST_COMPLETE
    );
  });

  it("should calculate match XP with no mistakes bonus", () => {
    const result = calculateSessionXP({
      type: "match",
      correctCount: 6,
      wrongCount: 0,
      totalCards: 6,
      isPerfect: false,
      noMistakes: true,
    });
    expect(result.xp).toBe(
      XP_REWARDS.MATCH_COMPLETE + XP_REWARDS.MATCH_NO_MISTAKES
    );
  });

  it("should calculate blast XP", () => {
    const result = calculateSessionXP({
      type: "blast",
      correctCount: 20,
      wrongCount: 3,
      totalCards: 23,
      isPerfect: false,
    });
    expect(result.xp).toBe(
      20 * XP_REWARDS.BLAST_POINT + XP_REWARDS.BLAST_COMPLETE
    );
  });
});

// --- getStreakBonus ---

describe("getStreakBonus", () => {
  it("should return 0 for streak < 3", () => {
    expect(getStreakBonus(0)).toBe(0);
    expect(getStreakBonus(1)).toBe(0);
    expect(getStreakBonus(2)).toBe(0);
  });

  it("should return STREAK_3 for 3-6", () => {
    expect(getStreakBonus(3)).toBe(XP_REWARDS.STREAK_3);
    expect(getStreakBonus(6)).toBe(XP_REWARDS.STREAK_3);
  });

  it("should return STREAK_7 for 7-29", () => {
    expect(getStreakBonus(7)).toBe(XP_REWARDS.STREAK_7);
    expect(getStreakBonus(15)).toBe(XP_REWARDS.STREAK_7);
    expect(getStreakBonus(29)).toBe(XP_REWARDS.STREAK_7);
  });

  it("should return STREAK_30 for 30+", () => {
    expect(getStreakBonus(30)).toBe(XP_REWARDS.STREAK_30);
    expect(getStreakBonus(100)).toBe(XP_REWARDS.STREAK_30);
  });
});
