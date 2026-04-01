import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Tüm desteleri getir
export async function GET() {
  try {
    const user = await requireAuth();

    const decks = await db.deck.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { cards: true },
        },
        cards: {
          select: {
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const result = decks.map((deck) => {
      const totalCards = deck._count.cards;
      const newCount = deck.cards.filter((c) => c.status === "NEW").length;
      const learningCount = deck.cards.filter(
        (c) =>
          (c.status === "LEARNING" || c.status === "RELEARN") &&
          new Date(c.dueDate) <= now
      ).length;
      const reviewCount = deck.cards.filter(
        (c) => c.status === "REVIEW" && new Date(c.dueDate) <= now
      ).length;
      const dueCount = learningCount + reviewCount;

      return {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        color: deck.color,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
        totalCards,
        newCount,
        learningCount,
        reviewCount,
        dueCount,
        createdAt: deck.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Error fetching decks:", error);
    return NextResponse.json(
      { error: "Desteler yüklenemedi" },
      { status: 500 }
    );
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Error creating deck:", error);
    return NextResponse.json(
      { error: "Deste oluşturulamadı" },
      { status: 500 }
    );
  }
}
