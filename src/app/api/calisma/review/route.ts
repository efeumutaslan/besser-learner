import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { calculateNextReview, type AnkiRating } from "@/lib/srs";
import { parseDeckSettings } from "@/lib/srs-settings";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// POST - Kart tekrarini kaydet
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
        { error: "Kart ID ve degerlendirme gerekli" },
        { status: 400 }
      );
    }

    if (!["again", "hard", "good", "easy"].includes(rating)) {
      return NextResponse.json(
        { error: "Gecersiz degerlendirme" },
        { status: 400 }
      );
    }

    // Kart sahiplik kontrolu
    const card = await requireCardOwnership(cardId, user.id);

    // Deck'in SRS ayarlarini al
    const deck = await db.deck.findUnique({
      where: { id: card.deckId },
    });

    const settings = parseDeckSettings(deck ?? {});

    // SM-2 algoritmasi ile sonraki tekrari hesapla
    const result = calculateNextReview(
      {
        interval: card.interval,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        lapses: card.lapses,
        learningStep: card.learningStep,
      },
      rating,
      settings
    );

    // Karti ve review'i guncelle
    const updatedCard = await db.card.update({
      where: { id: cardId },
      data: {
        interval: result.interval,
        repetitions: result.repetitions,
        easeFactor: result.easeFactor,
        dueDate: result.dueDate,
        status: result.status,
        lapses: result.lapses,
        learningStep: result.learningStep,
      },
    });

    await db.review.create({
      data: {
        cardId,
        quality: rating === "again" ? 0 : rating === "hard" ? 3 : rating === "good" ? 4 : 5,
        interval: result.interval,
        easeFactor: result.easeFactor,
      },
    });

    return NextResponse.json({
      card: updatedCard,
      nextReview: {
        interval: result.interval,
        dueDate: result.dueDate,
        status: result.status,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "Tekrar kaydedilemedi");
  }
}
