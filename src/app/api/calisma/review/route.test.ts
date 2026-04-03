import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    card: { update: vi.fn() },
    deck: { findUnique: vi.fn() },
    review: { create: vi.fn() },
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

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/calisma/review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    deckId: "deck-1",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    lapses: 0,
    learningStep: 0,
    status: "NEW",
    deck: { userId: "user-1" },
    ...overrides,
  } as never;
}

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

describe("POST /api/calisma/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);
    vi.mocked(db.card.update).mockResolvedValue({ id: "card-1" } as never);
    vi.mocked(db.review.create).mockResolvedValue({ id: "r1" } as never);
  });

  // --- Validation ---

  it("should return 400 if cardId is missing", async () => {
    const res = await POST(makeRequest({ rating: "good" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 if rating is missing", async () => {
    const res = await POST(makeRequest({ cardId: "card-1" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid rating", async () => {
    const res = await POST(makeRequest({ cardId: "card-1", rating: "excellent" }));
    expect(res.status).toBe(400);
  });

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await POST(makeRequest({ cardId: "card-1", rating: "good" }));
    expect(res.status).toBe(401);
  });

  it("should return 404 if card not found", async () => {
    vi.mocked(requireCardOwnership).mockRejectedValue(new Error("NOT_FOUND"));
    const res = await POST(makeRequest({ cardId: "card-1", rating: "good" }));
    expect(res.status).toBe(404);
  });

  it("should return 404 if card belongs to another user", async () => {
    vi.mocked(requireCardOwnership).mockRejectedValue(new Error("FORBIDDEN"));
    const res = await POST(makeRequest({ cardId: "card-1", rating: "good" }));
    expect(res.status).toBe(404);
  });

  // --- Successful review ---

  it("should process 'good' rating for NEW card", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    const res = await POST(makeRequest({ cardId: "card-1", rating: "good" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nextReview).toBeDefined();
    expect(data.nextReview.status).toBeDefined();

    // Card should be updated
    expect(db.card.update).toHaveBeenCalledOnce();
    // Review should be created
    expect(db.review.create).toHaveBeenCalledOnce();
  });

  it("should process 'again' rating for REVIEW card", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(
      mockCard({ status: "REVIEW", interval: 10, repetitions: 3, easeFactor: 2.5 })
    );

    const res = await POST(makeRequest({ cardId: "card-1", rating: "again" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    // Review record should have quality 0 for "again"
    const reviewCall = vi.mocked(db.review.create).mock.calls[0][0];
    expect(reviewCall.data.quality).toBe(0);
  });

  it("should process 'hard' rating", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(
      mockCard({ status: "REVIEW", interval: 5, repetitions: 2 })
    );

    const res = await POST(makeRequest({ cardId: "card-1", rating: "hard" }));
    expect(res.status).toBe(200);

    const reviewCall = vi.mocked(db.review.create).mock.calls[0][0];
    expect(reviewCall.data.quality).toBe(3);
  });

  it("should process 'easy' rating", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());

    const res = await POST(makeRequest({ cardId: "card-1", rating: "easy" }));
    expect(res.status).toBe(200);

    const reviewCall = vi.mocked(db.review.create).mock.calls[0][0];
    expect(reviewCall.data.quality).toBe(5);
  });

  it("should load deck settings for SRS calculation", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(mockCard());
    await POST(makeRequest({ cardId: "card-1", rating: "good" }));

    expect(db.deck.findUnique).toHaveBeenCalledWith({
      where: { id: "deck-1" },
    });
  });

  it("should pass learningStep to SRS algorithm", async () => {
    vi.mocked(requireCardOwnership).mockResolvedValue(
      mockCard({ status: "LEARNING", learningStep: 1 })
    );

    const res = await POST(makeRequest({ cardId: "card-1", rating: "good" }));
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(db.card.update).mock.calls[0][0];
    expect(updateCall.data.learningStep).toBeDefined();
  });
});
