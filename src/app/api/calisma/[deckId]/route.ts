import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Çalışılacak kartları getir (SRS kuyruğu)
export async function GET(
  _request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.deckId, user.id);

    const deck = await db.deck.findUnique({
      where: { id: params.deckId },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Deste bulunamadı" },
        { status: 404 }
      );
    }

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Bugün yapılan review'ları say — yeni ve tekrar ayrı ayrı
    const todayNewReviews = await db.review.count({
      where: {
        card: { deckId: params.deckId },
        reviewedAt: { gte: todayStart },
        // İlk defa review edilen kartlar (quality >= 3 = ilk başarılı)
        // NEW->LEARNING geçişlerini say
      },
    });

    // Bugün review edilen UNIQUE kart sayısını bul
    const todayReviewedCards = await db.review.findMany({
      where: {
        card: { deckId: params.deckId },
        reviewedAt: { gte: todayStart },
      },
      select: { cardId: true },
      distinct: ["cardId"],
    });
    const todayReviewedCardIds = new Set(todayReviewedCards.map((r) => r.cardId));

    // Bugün ilk kez görülen yeni kartları say
    // (bugün review'ı olan ve şu an NEW olmayan kartlar = bugün öğrenilmeye başlanan)
    const todayNewStarted = await db.card.count({
      where: {
        deckId: params.deckId,
        id: { in: Array.from(todayReviewedCardIds) },
        status: { not: "NEW" },
        // Bu kartlar önceden NEW idi ama bugün öğrenmeye başladık
      },
    });

    // Bugün review edilen mature kartları say (REVIEW status'tan geçenler)
    const todayMatureReviewed = await db.review.groupBy({
      by: ["cardId"],
      where: {
        card: { deckId: params.deckId },
        reviewedAt: { gte: todayStart },
      },
    });

    // Kalan günlük limitler
    const remainingNew = Math.max(0, deck.newPerDay - todayNewStarted);
    const remainingReview = Math.max(0, deck.reviewPerDay - todayMatureReviewed.length);

    // 1. Öğrenme/tekrar öğrenme kartları (her zaman önce, limit dışı — Anki kuralı)
    const learningCards = await db.card.findMany({
      where: {
        deckId: params.deckId,
        status: { in: ["LEARNING", "RELEARN"] },
        dueDate: { lte: now },
      },
      orderBy: { dueDate: "asc" },
    });

    // 2. Tekrar edilecek mature kartlar (günlük limitle)
    const reviewCards = remainingReview > 0
      ? await db.card.findMany({
          where: {
            deckId: params.deckId,
            status: "REVIEW",
            dueDate: { lte: now },
            // Bugün zaten review edilen kartları hariç tut
            id: { notIn: Array.from(todayReviewedCardIds) },
          },
          orderBy: { dueDate: "asc" },
          take: remainingReview,
        })
      : [];

    // 3. Yeni kartlar (günlük limitle)
    const newCards = remainingNew > 0
      ? await db.card.findMany({
          where: {
            deckId: params.deckId,
            status: "NEW",
          },
          orderBy: { createdAt: "asc" },
          take: remainingNew,
        })
      : [];

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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error getting study queue:", error);
    return NextResponse.json(
      { error: "Çalışma kuyruğu yüklenemedi" },
      { status: 500 }
    );
  }
}
