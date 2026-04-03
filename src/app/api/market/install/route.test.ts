import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    deck: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "./route";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1", username: "test", displayName: "Test", theme: "system" };

const mockDeckFile = {
  name: "A1 Temel",
  description: "Test description",
  color: "#3B82F6",
  cards: [
    { word: "Haus", wordTranslation: "Ev", artikel: "das", plural: "Häuser" },
    { word: "Auto", wordTranslation: "Araba", artikel: "das" },
  ],
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/market/install", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/market/install", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(db.deck.findFirst).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDeckFile),
    });
    vi.mocked(db.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        deck: {
          create: vi.fn().mockResolvedValue({ id: "new-deck-1", name: "A1 Temel" }),
        },
        card: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return fn(tx);
    });
  });

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await POST(makeRequest({ file: "decks/a1.json" }));
    expect(res.status).toBe(401);
  });

  // --- Validation ---

  it("should return 400 if file is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("should return 400 for path traversal attempt", async () => {
    const res = await POST(makeRequest({ file: "decks/../../../etc/passwd" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 if file does not start with decks/", async () => {
    const res = await POST(makeRequest({ file: "other/file.json" }));
    expect(res.status).toBe(400);
  });

  // --- GitHub fetch ---

  it("should return 404 if deck file not found on GitHub", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const res = await POST(makeRequest({ file: "decks/nonexistent.json" }));
    expect(res.status).toBe(404);
  });

  it("should return 400 for empty cards array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: "Empty", cards: [] }),
    });
    const res = await POST(makeRequest({ file: "decks/empty.json" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 for missing name", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cards: [{ word: "Haus", wordTranslation: "Ev" }] }),
    });
    const res = await POST(makeRequest({ file: "decks/no-name.json" }));
    expect(res.status).toBe(400);
  });

  // --- Successful install ---

  it("should install deck and return success", async () => {
    const res = await POST(makeRequest({ file: "decks/a1-temel.json" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deck.name).toBe("A1 Temel");
    expect(data.deck.cardCount).toBe(2);
  });

  it("should append (Market) when deck name already exists", async () => {
    vi.mocked(db.deck.findFirst).mockResolvedValue({ id: "existing" } as never);

    vi.mocked(db.$transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        deck: {
          create: vi.fn().mockImplementation((args: { data: { name: string } }) => {
            return Promise.resolve({ id: "new-deck-1", name: args.data.name });
          }),
        },
        card: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      };
      return fn(tx);
    });

    const res = await POST(makeRequest({ file: "decks/a1-temel.json" }));
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.deck.name).toBe("A1 Temel (Market)");
  });

  it("should fetch from correct GitHub URL", async () => {
    await POST(makeRequest({ file: "decks/a1-temel.json" }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("raw.githubusercontent.com/efeumutaslan/besserlernen-decks/main/decks/a1-temel.json")
    );
  });
});
