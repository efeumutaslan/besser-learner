import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { calculateNextReview, type AnkiRating } from "@/lib/srs";
import { NextRequest, NextResponse } from "next/server";

// POST - Kart tekrarını kaydet
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { cardId, rating } = body as {
      cardId: string;
      rating: AnkiRating;
    };

    if (!cardId || !rating) {
      return NextResponse.json(
        { error: "Kart ID ve değerlendirme gerekli" },
        { status: 400 }
      );
    }

    if (!["again", "hard", "good", "easy"].includes(rating)) {
      return NextResponse.json(
        { error: "Geçersiz değerlendirme" },
        { status: 400 }
      );
    }

    // Kart sahiplik kontrolü
    const card = await requireCardOwnership(cardId, user.id);

    // SM-2 algoritmasıyla sonraki tekrarı hesapla
    const result = calculateNextReview(
      {
        interval: card.interval,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        lapses: card.lapses,
      },
      rating
    );

    // Kartı ve review'ı güncelle (transaction)
    const [updatedCard] = await db.$transaction([
      db.card.update({
        where: { id: cardId },
        data: {
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          dueDate: result.dueDate,
          status: result.status,
          lapses: result.lapses,
        },
      }),
      db.review.create({
        data: {
          cardId,
          quality: rating === "again" ? 0 : rating === "hard" ? 3 : rating === "good" ? 4 : 5,
          interval: result.interval,
          easeFactor: result.easeFactor,
        },
      }),
    ]);

    return NextResponse.json({
      card: updatedCard,
      nextReview: {
        interval: result.interval,
        dueDate: result.dueDate,
        status: result.status,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    console.error("Error recording review:", error);
    return NextResponse.json(
      { error: "Tekrar kaydedilemedi" },
      { status: 500 }
    );
  }
}
