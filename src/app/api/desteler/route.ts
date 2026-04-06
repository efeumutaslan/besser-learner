import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// GET - Tüm desteleri getir (optimized: groupBy ile kart sayimi)
export async function GET() {
  try {
    const user = await requireAuth();
    const now = new Date();

    // Paralel: desteler + kart istatistikleri
    const [decks, cardStats] = await Promise.all([
      db.deck.findMany({
        where: { userId: user.id },
        include: { _count: { select: { cards: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Tum kartlarin status dagilimini tek sorguda al
      db.card.groupBy({
        by: ["deckId", "status"],
        where: {
          deck: { userId: user.id },
        },
        _count: true,
      }),
    ]);

    // Due kartlari ayri say (dueDate filtresi groupBy'da zor)
    const dueCounts = await db.card.groupBy({
      by: ["deckId"],
      where: {
        deck: { userId: user.id },
        status: { in: ["LEARNING", "RELEARN", "REVIEW"] },
        dueDate: { lte: now },
      },
      _count: true,
    });

    // Lookup map'ler olustur
    const statsMap = new Map<string, { newCount: number; learningCount: number; reviewCount: number }>();
    for (const stat of cardStats) {
      const existing = statsMap.get(stat.deckId) || { newCount: 0, learningCount: 0, reviewCount: 0 };
      if (stat.status === "NEW") existing.newCount = stat._count;
      else if (stat.status === "LEARNING" || stat.status === "RELEARN") existing.learningCount += stat._count;
      else if (stat.status === "REVIEW") existing.reviewCount = stat._count;
      statsMap.set(stat.deckId, existing);
    }

    const dueMap = new Map(dueCounts.map((d) => [d.deckId, d._count]));

    const result = decks.map((deck) => {
      const stats = statsMap.get(deck.id) || { newCount: 0, learningCount: 0, reviewCount: 0 };
      return {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        color: deck.color,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
        totalCards: deck._count.cards,
        newCount: stats.newCount,
        learningCount: stats.learningCount,
        reviewCount: stats.reviewCount,
        dueCount: dueMap.get(deck.id) || 0,
        createdAt: deck.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, "Desteler yuklenemedi");
  }
}

// POST - Yeni deste oluştur
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, color, newPerDay, reviewPerDay } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Deste adı gerekli" },
        { status: 400 }
      );
    }

    const deck = await db.deck.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6366F1",
        newPerDay: newPerDay || 20,
        reviewPerDay: reviewPerDay || 200,
      },
    });

    return NextResponse.json(deck, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "Deste olusturulamadi");
  }
}
