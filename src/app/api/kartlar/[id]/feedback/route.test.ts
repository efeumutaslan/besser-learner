import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing route
vi.mock("@/lib/db", () => ({
  db: {
    review: { count: vi.fn(), create: vi.fn() },
    card: { update: vi.fn() },
    deck: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireCardOwnership: vi.fn(),
}));

import { POST } from "./route";
import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1", username: "test", displayName: "Test", theme: "system" };

function mockCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    deckId: "deck-1",
    mastery: "NEW",
    correctHits: 0,
    status: "NEW",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    lapses: 0,
    learningStep: 0,
    deck: { userId: "user-1" },
    ...overrides,
  } as never;
}

function makeRequest(body: Record<string, unknown>, cardId = "card-1") {
  return new NextRequest(`http://localhost/api/kartlar/${cardId}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = "card-1") {
  return { params: { id } };
}

describe("POST /api/kartlar/[id]/feedback", () => {
  const mockDeck = {
    id: "deck-1",
    learningSteps: "1,10",
    graduatingInterval: 1,
    easyInterval: 4,
    relearningSteps: "10",
    lapseMinInterval: 1,
    leechThreshold: 8,
    maxInterval: 36500,
    startingEase: 250,
    easyBonus: 130,
    intervalModifier: 100,
    hardModifier: 120,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);
  });

  // --- Validation ---

  it("should return 400 if isCorrect is missing", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    const res = await POST(makeRequest({ source: "learn" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 if source is missing", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    const res = await POST(makeRequest({ isCorrect: true }), makeParams());
    expect(res.status).toBe(400);
  });

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await POST(
      makeRequest({ isCorrect: true, source: "learn" }),
      makeParams()
    );
    expect(res.status).toBe(401);
  });

  it("should return 404 if card not found", async () => {
    vi.mocked(requireCardOwnership).mockRejectedValue(new Error("NOT_FOUND"));
    const res = await POST(
      makeRequest({ isCorrect: true, source: "learn" }),
      makeParams()
    );
    expect(res.status).toBe(404);
  });

  // --- NEW card + correct ---

  it("should set status LEARNING for NEW card + correct (first today)", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    vi.mocked(db.review.count).mockResolvedValue(0); // no reviews today
    vi.mocked(db.card.update).mockResolvedValue({ id: "card-1" } as never);
    vi.mocked(db.review.create).mockResolvedValue({ id: "review-1" } as never);

    const res = await POST(
      makeRequest({ isCorrect: true, source: "learn" }),
      makeParams()
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.srsApplied).toBe(true);

    // Check card.update was called with LEARNING status
    const updateCall = vi.mocked(db.card.update).mock.calls[0][0];
    expect(updateCall.data.status).toBe("LEARNING");
    expect(updateCall.data.mastery).toBe("FAMILIAR"); // NEW + correct -> FAMILIAR
  });

  // --- NEW card + wrong ---

  it("should not apply SRS for NEW card + wrong", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.update).mockResolvedValue({ id: "card-1" } as never);

    const res = await POST(
      makeRequest({ isCorrect: false, source: "learn" }),
      makeParams()
    );
    const data = await res.json();

    expect(data.srsApplied).toBe(true); // shouldApplySRS is true (no reviews today)
    // But no review record should be created (NEW + wrong)
    expect(db.review.create).not.toHaveBeenCalled();

    // Mastery should update to SEEN
    const updateCall = vi.mocked(db.card.update).mock.calls[0][0];
    expect(updateCall.data.mastery).toBe("SEEN");
  });

  // --- SRS dedup ---

  it("should not apply SRS if already reviewed today (dedup)", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard({
      mastery: "FAMILIAR",
      correctHits: 1,
      status: "LEARNING",
      interval: 1,
      repetitions: 1,
    }));

    vi.mocked(db.review.count).mockResolvedValue(1); // already reviewed today
    vi.mocked(db.card.update).mockResolvedValue({ id: "card-1" } as never);

    const res = await POST(
      makeRequest({ isCorrect: true, source: "test" }),
      makeParams()
    );
    const data = await res.json();

    expect(data.srsApplied).toBe(false);
    // Mastery should still update
    expect(data.mastery).toBe("MASTERED"); // FAMILIAR + correct + 1 hit -> MASTERED

    // No review record created
    expect(db.review.create).not.toHaveBeenCalled();

    // Card update should NOT have SRS fields
    const updateCall = vi.mocked(db.card.update).mock.calls[0][0];
    expect(updateCall.data.status).toBeUndefined();
    expect(updateCall.data.interval).toBeUndefined();
  });

  // --- LEARNING card + correct with SRS ---

  it("should apply SRS for LEARNING card + correct", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard({
      mastery: "FAMILIAR",
      correctHits: 1,
      status: "LEARNING",
      interval: 1,
      repetitions: 1,
    }));

    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.update).mockResolvedValue({ id: "card-1" } as never);
    vi.mocked(db.review.create).mockResolvedValue({ id: "review-1" } as never);

    const res = await POST(
      makeRequest({ isCorrect: true, source: "learn" }),
      makeParams()
    );
    const data = await res.json();

    expect(data.srsApplied).toBe(true);

    // SRS should be applied - card update should have interval, status etc.
    const updateCall = vi.mocked(db.card.update).mock.calls[0][0];
    expect(updateCall.data.interval).toBeDefined();
    expect(updateCall.data.easeFactor).toBeDefined();

    // Review record should be created
    expect(db.review.create).toHaveBeenCalled();
  });
});
