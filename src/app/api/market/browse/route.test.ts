import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "./route";
import { requireAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockUser = { id: "user-1", username: "test", displayName: "Test", theme: "system" };

const mockIndex = {
  categories: [
    { id: "goethe-a1", name: "Goethe A1", icon: "G" },
    { id: "gramer", name: "Gramer", icon: "Gr" },
  ],
  decks: [
    {
      id: "a1-temel",
      name: "A1 Temel Kelimeler",
      description: "Temel A1 kelimeleri",
      category: "goethe-a1",
      cardCount: 50,
      author: "BesserLernen",
      file: "decks/a1-temel.json",
      tags: ["A1", "temel"],
    },
    {
      id: "artikel",
      name: "Artikel Kuralları",
      description: "Der die das kuralları",
      category: "gramer",
      cardCount: 35,
      author: "BesserLernen",
      file: "decks/artikel.json",
      tags: ["gramer", "artikel"],
    },
  ],
};

function makeRequest(params = "") {
  return new NextRequest(`http://localhost/api/market/browse${params ? "?" + params : ""}`);
}

describe("GET /api/market/browse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIndex),
    });
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("should return all decks and categories", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.categories).toHaveLength(2);
    expect(data.decks).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  it("should filter by category", async () => {
    const res = await GET(makeRequest("category=goethe-a1"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].id).toBe("a1-temel");
    expect(data.total).toBe(1);
  });

  it("should filter by search query (name)", async () => {
    const res = await GET(makeRequest("search=artikel"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].id).toBe("artikel");
  });

  it("should filter by search query (tags)", async () => {
    const res = await GET(makeRequest("search=temel"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].id).toBe("a1-temel");
  });

  it("should filter by search query (description)", async () => {
    const res = await GET(makeRequest("search=das"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].id).toBe("artikel");
  });

  it("should return empty when search has no matches", async () => {
    const res = await GET(makeRequest("search=nonexistent"));
    const data = await res.json();

    expect(data.decks).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it("should combine category and search filters", async () => {
    const res = await GET(makeRequest("category=gramer&search=artikel"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].category).toBe("gramer");
  });

  it("should return 502 if GitHub fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(502);
  });

  it("should be case insensitive for search", async () => {
    const res = await GET(makeRequest("search=ARTIKEL"));
    const data = await res.json();

    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].id).toBe("artikel");
  });
});
