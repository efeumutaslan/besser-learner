import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    deck: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

import { GET, POST } from "./route";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1", username: "test", displayName: "Test", theme: "system" };

describe("GET /api/desteler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("should return decks with counts", async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000);
    const futureDate = new Date(now.getTime() + 86400000);

    vi.mocked(db.deck.findMany).mockResolvedValue([
      {
        id: "deck-1",
        name: "Test Deck",
        description: "Desc",
        color: "#6366F1",
        newPerDay: 20,
        reviewPerDay: 200,
        createdAt: now,
        _count: { cards: 5 },
        cards: [
          { status: "NEW", dueDate: now },
          { status: "NEW", dueDate: now },
          { status: "LEARNING", dueDate: pastDate },
          { status: "REVIEW", dueDate: pastDate },
          { status: "REVIEW", dueDate: futureDate },
        ],
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].totalCards).toBe(5);
    expect(data[0].newCount).toBe(2);
    expect(data[0].learningCount).toBe(1);
    expect(data[0].reviewCount).toBe(1); // only past due
    expect(data[0].dueCount).toBe(2); // learning + review
  });

  it("should return empty array when no decks", async () => {
    vi.mocked(db.deck.findMany).mockResolvedValue([]);
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should count RELEARN cards in learningCount", async () => {
    const pastDate = new Date(Date.now() - 86400000);
    vi.mocked(db.deck.findMany).mockResolvedValue([
      {
        id: "deck-1",
        name: "Test",
        description: null,
        color: "#000",
        newPerDay: 20,
        reviewPerDay: 200,
        createdAt: new Date(),
        _count: { cards: 2 },
        cards: [
          { status: "RELEARN", dueDate: pastDate },
          { status: "LEARNING", dueDate: pastDate },
        ],
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data[0].learningCount).toBe(2);
    expect(data[0].dueCount).toBe(2);
  });
});

describe("POST /api/desteler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const req = new NextRequest("http://localhost/api/desteler", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if name is missing", async () => {
    const req = new NextRequest("http://localhost/api/desteler", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if name is empty string", async () => {
    const req = new NextRequest("http://localhost/api/desteler", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should create deck with defaults", async () => {
    const created = {
      id: "deck-new",
      name: "Yeni Deste",
      description: null,
      color: "#6366F1",
      newPerDay: 20,
      reviewPerDay: 200,
      userId: "user-1",
    };
    vi.mocked(db.deck.create).mockResolvedValue(created as never);

    const req = new NextRequest("http://localhost/api/desteler", {
      method: "POST",
      body: JSON.stringify({ name: "Yeni Deste" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe("Yeni Deste");

    const createCall = vi.mocked(db.deck.create).mock.calls[0][0];
    expect(createCall.data.userId).toBe("user-1");
    expect(createCall.data.color).toBe("#6366F1");
  });

  it("should trim name and description", async () => {
    vi.mocked(db.deck.create).mockResolvedValue({ id: "d1" } as never);

    const req = new NextRequest("http://localhost/api/desteler", {
      method: "POST",
      body: JSON.stringify({ name: "  Test  ", description: "  Desc  " }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    const createCall = vi.mocked(db.deck.create).mock.calls[0][0];
    expect(createCall.data.name).toBe("Test");
    expect(createCall.data.description).toBe("Desc");
  });
});
