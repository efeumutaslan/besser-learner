import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { calculateSimpleStats } from "@/lib/deck-stats";
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
            id: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = decks.map((deck) => {
      const stats = calculateSimpleStats(deck.cards);
      return {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        color: deck.color,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
        totalCards: deck._count.cards,
        ...stats,
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
