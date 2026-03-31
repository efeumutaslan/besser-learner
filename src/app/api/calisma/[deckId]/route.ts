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

    // Bugün yapılan reviewları say
    const todayReviews = await db.review.count({
      where: {
        card: { deckId: params.deckId },
        reviewedAt: { gte: todayStart },
      },
    });

    // 1. Öğrenme/tekrar öğrenme kartları (her zaman önce gösterilir)
    const learningCards = await db.card.findMany({
      where: {
        deckId: params.deckId,
        status: { in: ["LEARNING", "RELEARN"] },
        dueDate: { lte: now },
      },
      orderBy: { dueDate: "asc" },
    });

    // 2. Tekrar edilecek kartlar
    const reviewCards = await db.card.findMany({
      where: {
        deckId: params.deckId,
        status: "REVIEW",
        dueDate: { lte: now },
      },
      orderBy: { dueDate: "asc" },
      take: deck.reviewPerDay,
    });

    // 3. Yeni kartlar
    const newCards = await db.card.findMany({
      where: {
        deckId: params.deckId,
        status: "NEW",
      },
      orderBy: { createdAt: "asc" },
      take: deck.newPerDay,
    });

    // Kuyruk: önce learning, sonra review, sonra new
    const queue = [...learningCards, ...reviewCards, ...newCards];

    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
      },
      queue,
      counts: {
        learning: learningCards.length,
        review: reviewCards.length,
        new: newCards.length,
        total: queue.length,
        todayReviews,
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
