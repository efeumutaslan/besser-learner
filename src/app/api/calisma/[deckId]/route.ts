import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// GET - Çalışılacak kartları getir (SRS kuyruğu)
export async function GET(
  _request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.deckId, user.id);

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Paralel: deck + bugunun review'lari + learning kartlar ayni anda
    const [deck, todayReviewedCards, learningCards] = await Promise.all([
      db.deck.findUnique({
        where: { id: params.deckId },
      }),
      db.review.findMany({
        where: {
          card: { deckId: params.deckId },
          reviewedAt: { gte: todayStart },
        },
        select: { cardId: true },
        distinct: ["cardId"],
      }),
      db.card.findMany({
        where: {
          deckId: params.deckId,
          status: { in: ["LEARNING", "RELEARN"] },
          dueDate: { lte: now },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    if (!deck) {
      return NextResponse.json(
        { error: "Deste bulunamadı" },
        { status: 404 }
      );
    }

    const todayReviewedCardIds = new Set(todayReviewedCards.map((r) => r.cardId));

    // Paralel: bugun baslanan yeni kartlari say + bugun review edilen mature
    const [todayNewStarted, todayMatureReviewed] = await Promise.all([
      db.card.count({
        where: {
          deckId: params.deckId,
          id: { in: Array.from(todayReviewedCardIds) },
          status: { not: "NEW" },
        },
      }),
      db.review.groupBy({
        by: ["cardId"],
        where: {
          card: { deckId: params.deckId },
          reviewedAt: { gte: todayStart },
        },
      }),
    ]);

    // Kalan günlük limitler
    const remainingNew = Math.max(0, deck.newPerDay - todayNewStarted);
    const remainingReview = Math.max(0, deck.reviewPerDay - todayMatureReviewed.length);

    // Paralel: review + new kartlari ayni anda cek
    const [reviewCards, newCards] = await Promise.all([
      remainingReview > 0
        ? db.card.findMany({
            where: {
              deckId: params.deckId,
              status: "REVIEW",
              dueDate: { lte: now },
              id: { notIn: Array.from(todayReviewedCardIds) },
            },
            orderBy: { dueDate: "asc" },
            take: remainingReview,
          })
        : Promise.resolve([]),
      remainingNew > 0
        ? db.card.findMany({
            where: {
              deckId: params.deckId,
              status: "NEW",
            },
            orderBy: { createdAt: "asc" },
            take: remainingNew,
          })
        : Promise.resolve([]),
    ]);

    // Kuyruk: önce learning, sonra review, sonra new
    const queue = [...learningCards, ...reviewCards, ...newCards];

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
        learningSteps: deck.learningSteps,
        graduatingInterval: deck.graduatingInterval,
        easyInterval: deck.easyInterval,
        relearningSteps: deck.relearningSteps,
        lapseMinInterval: deck.lapseMinInterval,
        maxInterval: deck.maxInterval,
        startingEase: deck.startingEase,
        easyBonus: deck.easyBonus,
        intervalModifier: deck.intervalModifier,
        hardModifier: deck.hardModifier,
      },
      queue,
      counts: {
        learning: learningCards.length,
        review: reviewCards.length,
        new: newCards.length,
        total: queue.length,
        todayReviews: todayReviewedCardIds.size,
        remainingNew,
        remainingReview,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "Calisma kuyrugu yuklenemedi");
  }
}
