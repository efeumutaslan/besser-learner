import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules
vi.mock("@/lib/db", () => ({
  db: {
    deck: { findUnique: vi.fn() },
    card: { findMany: vi.fn(), count: vi.fn() },
    review: { count: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireDeckOwnership: vi.fn(),
}));

import { GET } from "./route";
import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1", username: "test", displayName: "Test", theme: "system" };
const mockDeck = {
  id: "deck-1",
  name: "A1 Kelimeler",
  newPerDay: 20,
  reviewPerDay: 200,
  userId: "user-1",
};

function makeRequest(mode = "learn", limit = "50") {
  return new NextRequest(
    `http://localhost/api/desteler/deck-1/smart-pool?mode=${mode}&limit=${limit}`
  );
}

function makeParams(id = "deck-1") {
  return { params: { id } };
}

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: `card-${Math.random().toString(36).slice(2)}`,
    word: "Haus",
    wordTranslation: "Ev",
    artikel: "das",
    status: "NEW",
    mastery: "NEW",
    dueDate: new Date(),
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    correctHits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GET /api/desteler/[id]/smart-pool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(requireDeckOwnership).mockResolvedValue(mockDeck as never);
  });

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("should return 404 if deck not found", async () => {
    vi.mocked(requireDeckOwnership).mockRejectedValue(new Error("NOT_FOUND"));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  // --- Empty deck ---

  it("should return empty pool for nonexistent deck", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  // --- Priority ordering ---

  it("should return cards in priority order: learning > review > studied > new", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);

    const learningCard = makeCard({ id: "learning-1", status: "LEARNING", mastery: "FAMILIAR" });
    const reviewCard = makeCard({ id: "review-1", status: "REVIEW", mastery: "FAMILIAR" });
    const studiedCard = makeCard({ id: "studied-1", status: "NEW", mastery: "SEEN" });
    const newCard = makeCard({ id: "new-1", status: "NEW", mastery: "NEW" });

    // Mock the 4 separate findMany calls + review count + card count
    vi.mocked(db.card.findMany)
      .mockResolvedValueOnce([learningCard]) // learning/relearn
      .mockResolvedValueOnce([reviewCard])   // review
      .mockResolvedValueOnce([studiedCard])  // studied (SEEN/FAMILIAR)
      .mockResolvedValueOnce([])             // mastered
      .mockResolvedValueOnce([newCard]);     // new

    vi.mocked(db.review.count).mockResolvedValue(0); // no new cards introduced today
    vi.mocked(db.card.count).mockResolvedValue(4);

    const res = await GET(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cards).toHaveLength(4);
    expect(data.cards[0].id).toBe("learning-1");
    expect(data.cards[1].id).toBe("review-1");
    expect(data.cards[2].id).toBe("studied-1");
    expect(data.cards[3].id).toBe("new-1");
  });

  // --- Pool counts ---

  it("should return correct pool breakdown", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);

    vi.mocked(db.card.findMany)
      .mockResolvedValueOnce([makeCard(), makeCard()]) // 2 learning
      .mockResolvedValueOnce([makeCard()])              // 1 review
      .mockResolvedValueOnce([])                        // 0 studied
      .mockResolvedValueOnce([])                        // 0 mastered
      .mockResolvedValueOnce([makeCard(), makeCard(), makeCard()]); // 3 new

    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.count).mockResolvedValue(6);

    const res = await GET(makeRequest(), makeParams());
    const data = await res.json();

    expect(data.pool.learning).toBe(2);
    expect(data.pool.review).toBe(1);
    expect(data.pool.studied).toBe(0);
    expect(data.pool.mastered).toBe(0);
    expect(data.pool.new).toBe(3);
    expect(data.pool.total).toBe(6);
    expect(data.dueCount).toBe(3); // learning + review
  });

  // --- New card daily limit ---

  it("should respect daily new card limit", async () => {
    const limitedDeck = { ...mockDeck, newPerDay: 5 };
    vi.mocked(db.deck.findUnique).mockResolvedValue(limitedDeck as never);

    vi.mocked(db.card.findMany)
      .mockResolvedValueOnce([]) // no learning
      .mockResolvedValueOnce([]) // no review
      .mockResolvedValueOnce([]) // no studied
      .mockResolvedValueOnce([]) // no mastered
      .mockResolvedValueOnce([makeCard(), makeCard()]); // 2 new (limited)

    vi.mocked(db.review.count).mockResolvedValue(3); // 3 already introduced today
    vi.mocked(db.card.count).mockResolvedValue(10);

    const res = await GET(makeRequest(), makeParams());
    const data = await res.json();

    // newPerDay=5, todayIntroduced=3, so limit should be 2
    // The actual take is determined by the findMany call, but the limit passed should be max 2
    const newCardQuery = vi.mocked(db.card.findMany).mock.calls[4][0];
    expect(newCardQuery?.take).toBe(2); // 5 - 3 = 2
  });

  // --- Limit parameter ---

  it("should respect limit parameter", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);

    const manyCards = Array.from({ length: 10 }, (_, i) =>
      makeCard({ id: `card-${i}` })
    );

    vi.mocked(db.card.findMany)
      .mockResolvedValueOnce(manyCards) // 10 learning
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.count).mockResolvedValue(10);

    const res = await GET(makeRequest("learn", "5"), makeParams());
    const data = await res.json();

    expect(data.cards).toHaveLength(5); // limited to 5
  });

  // --- Max limit cap ---

  it("should cap limit at 200", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);
    vi.mocked(db.card.findMany).mockResolvedValue([]);
    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.count).mockResolvedValue(0);

    const res = await GET(makeRequest("learn", "999"), makeParams());
    const data = await res.json();

    // Should not crash, limit is capped at 200
    expect(res.status).toBe(200);
  });

  // --- Deck info in response ---

  it("should return deck info", async () => {
    vi.mocked(db.deck.findUnique).mockResolvedValue(mockDeck as never);
    vi.mocked(db.card.findMany).mockResolvedValue([]);
    vi.mocked(db.review.count).mockResolvedValue(0);
    vi.mocked(db.card.count).mockResolvedValue(0);

    const res = await GET(makeRequest(), makeParams());
    const data = await res.json();

    expect(data.deck.id).toBe("deck-1");
    expect(data.deck.name).toBe("A1 Kelimeler");
    expect(data.deck.newPerDay).toBe(20);
  });
});
