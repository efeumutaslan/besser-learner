import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { searchImagesForWords } from "@/lib/image-search";
import { NextRequest, NextResponse } from "next/server";

const MARKET_REPO = "efeumutaslan/besserlernen-decks";
const RAW_BASE = `https://raw.githubusercontent.com/${MARKET_REPO}/main`;

interface MarketCard {
  word: string;
  wordTranslation: string;
  artikel?: string | null;
  plural?: string | null;
  exampleSentence?: string | null;
  sentenceTranslation?: string | null;
  notes?: string | null;
}

interface MarketDeckFile {
  name: string;
  description?: string;
  color?: string;
  cards: MarketCard[];
}

// POST /api/market/install — { file: "decks/a1-kelimeler.json" }
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { file } = body as { file: string };

    if (!file) {
      return NextResponse.json(
        { error: "Dosya yolu gerekli" },
        { status: 400 }
      );
    }

    // Guvenlik: sadece decks/ altindan dosya yuklenmesine izin ver
    if (!file.startsWith("decks/") || file.includes("..")) {
      return NextResponse.json(
        { error: "Gecersiz dosya yolu" },
        { status: 400 }
      );
    }

    // GitHub'dan deste dosyasini indir
    const res = await fetch(`${RAW_BASE}/${file}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Deste dosyasi bulunamadi" },
        { status: 404 }
      );
    }

    const deckData: MarketDeckFile = await res.json();

    if (!deckData.name || !deckData.cards || deckData.cards.length === 0) {
      return NextResponse.json(
        { error: "Gecersiz deste formati" },
        { status: 400 }
      );
    }

    // Ayni isimde deste var mi kontrol et
    const existing = await db.deck.findFirst({
      where: { userId: user.id, name: deckData.name },
    });

    const deckName = existing
      ? `${deckData.name} (Market)`
      : deckData.name;

    // Kartlar için otomatik resim çek (arka planda, bloklamaz)
    const validCards = deckData.cards.filter(
      (c) => c.word?.trim() && c.wordTranslation?.trim()
    );
    const words = validCards.map((c) => c.word.trim());
    const imageMap = await searchImagesForWords(words);

    // Deste + kartlari olustur
    const deck = await db.$transaction(async (tx) => {
      const newDeck = await tx.deck.create({
        data: {
          userId: user.id,
          name: deckName,
          description: deckData.description || null,
          color: deckData.color || "#6366F1",
        },
      });

      await tx.card.createMany({
        data: validCards.map((card) => ({
            deckId: newDeck.id,
            word: card.word.trim(),
            wordTranslation: card.wordTranslation.trim(),
            artikel: card.artikel?.toLowerCase() || null,
            plural: card.plural?.trim() || null,
            exampleSentence: card.exampleSentence?.trim() || null,
            sentenceTranslation: card.sentenceTranslation?.trim() || null,
            notes: card.notes?.trim() || null,
            imageUrl: imageMap.get(card.word.trim()) || null,
          })),
      });

      return newDeck;
    });

    return NextResponse.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        cardCount: deckData.cards.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 401 });
    }
    console.error("Market install error:", error);
    return NextResponse.json(
      { error: "Deste yuklenemedi" },
      { status: 500 }
    );
  }
}
