import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Tek deste detayı
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    const deck = await db.deck.findUnique({
      where: { id: params.id },
      include: {
        cards: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { cards: true },
        },
      },
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

    // Bugün review edilen unique kart sayısı
    const todayReviewedCards = await db.review.findMany({
      where: {
        card: { deckId: params.id },
        reviewedAt: { gte: todayStart },
      },
      select: { cardId: true },
      distinct: ["cardId"],
    });
    const todayReviewedCardIds = new Set(todayReviewedCards.map((r) => r.cardId));

    // Bugün başlanan yeni kart sayısı
    const todayNewStarted = await db.card.count({
      where: {
        deckId: params.id,
        id: { in: Array.from(todayReviewedCardIds) },
        status: { not: "NEW" },
      },
    });

    const remainingNew = Math.max(0, deck.newPerDay - todayNewStarted);
    const remainingReview = Math.max(0, deck.reviewPerDay - todayReviewedCards.length);

    // Aktif öğrenimdeki kartlar (due olanlar)
    const learningDueCount = deck.cards.filter(
      (c) => (c.status === "LEARNING" || c.status === "RELEARN") && new Date(c.dueDate) <= now
    ).length;

    // Due olan review kartları (henüz bugün yapılmamış + limit dahilinde)
    const reviewDueCards = deck.cards.filter(
      (c) => c.status === "REVIEW" && new Date(c.dueDate) <= now && !todayReviewedCardIds.has(c.id)
    );
    const reviewDueCount = Math.min(reviewDueCards.length, remainingReview);

    // Gösterilecek yeni kart sayısı (limit dahilinde)
    const newCount = Math.min(
      deck.cards.filter((c) => c.status === "NEW").length,
      remainingNew
    );

    const stats = {
      total: deck._count.cards,
      new: newCount,
      learning: learningDueCount,
      review: reviewDueCount,
      mature: deck.cards.filter(
        (c) => c.status === "REVIEW" && c.interval >= 21
      ).length,
    };

    return NextResponse.json({ ...deck, stats });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error fetching deck:", error);
    return NextResponse.json(
      { error: "Deste yüklenemedi" },
      { status: 500 }
    );
  }
}

// PUT - Deste güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    const body = await request.json();
    const {
      name, description, color, newPerDay, reviewPerDay,
      // SRS ayarlari
      learningSteps, graduatingInterval, easyInterval,
      relearningSteps, lapseMinInterval, leechThreshold,
      maxInterval, startingEase, easyBonus, intervalModifier, hardModifier,
    } = body;

    const deck = await db.deck.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(color !== undefined && { color }),
        ...(newPerDay !== undefined && { newPerDay }),
        ...(reviewPerDay !== undefined && { reviewPerDay }),
        // SRS ayarlari
        ...(learningSteps !== undefined && { learningSteps }),
        ...(graduatingInterval !== undefined && { graduatingInterval }),
        ...(easyInterval !== undefined && { easyInterval }),
        ...(relearningSteps !== undefined && { relearningSteps }),
        ...(lapseMinInterval !== undefined && { lapseMinInterval }),
        ...(leechThreshold !== undefined && { leechThreshold }),
        ...(maxInterval !== undefined && { maxInterval }),
        ...(startingEase !== undefined && { startingEase }),
        ...(easyBonus !== undefined && { easyBonus }),
        ...(intervalModifier !== undefined && { intervalModifier }),
        ...(hardModifier !== undefined && { hardModifier }),
      },
    });

    return NextResponse.json(deck);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error updating deck:", error);
    return NextResponse.json(
      { error: "Deste güncellenemedi" },
      { status: 500 }
    );
  }
}

// DELETE - Deste sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    await db.deck.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error deleting deck:", error);
    return NextResponse.json(
      { error: "Deste silinemedi" },
      { status: 500 }
    );
  }
}
