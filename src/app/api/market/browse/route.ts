import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

const MARKET_REPO = "efeumutaslan/besserlernen-decks";
const RAW_BASE = `https://raw.githubusercontent.com/${MARKET_REPO}/main`;

export interface MarketDeck {
  id: string;
  name: string;
  description: string;
  category: string;
  cardCount: number;
  author: string;
  file: string; // JSON dosya yolu (orn: "decks/a1-kelimeler.json")
  tags?: string[];
}

export interface MarketIndex {
  categories: { id: string; name: string; icon: string }[];
  decks: MarketDeck[];
}

// GET /api/market/browse?category=a1
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase();

    // index.json'u GitHub'dan cek (cache 5dk)
    const res = await fetch(`${RAW_BASE}/index.json`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Market verisi yuklenemedi" },
        { status: 502 }
      );
    }

    const index: MarketIndex = await res.json();

    let decks = index.decks;

    // Kategori filtresi
    if (category) {
      decks = decks.filter((d) => d.category === category);
    }

    // Arama filtresi
    if (search) {
      decks = decks.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      categories: index.categories,
      decks,
      total: decks.length,
    });
  } catch (error: unknown) {
    return handleApiError(error, "Market yuklenemedi");
  }
}
