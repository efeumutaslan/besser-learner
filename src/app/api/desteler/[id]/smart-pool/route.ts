import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Akıllı kart havuzu (fun modlar için filtrelenmiş + öncelikli)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "learn";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const deck = await db.deck.findUnique({
      where: { id: params.id },
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

    // Öncelik 1: LEARNING/RELEARN kartlar (aktif öğrenilen)
    const learningCards = await db.card.findMany({
      where: {
        deckId: params.id,
        status: { in: ["LEARNING", "RELEARN"] },
        dueDate: { lte: now },
      },
      orderBy: { dueDate: "asc" },
    });

    // Öncelik 2: REVIEW kartlar (tekrarı gelen)
    const reviewCards = await db.card.findMany({
      where: {
        deckId: params.id,
        status: "REVIEW",
        dueDate: { lte: now },
      },
      orderBy: { dueDate: "asc" },
    });

    // Öncelik 3: Çalışılmış ama ustalaşılmamış kartlar
    const studiedCards = await db.card.findMany({
      where: {
        deckId: params.id,
        mastery: { in: ["SEEN", "FAMILIAR"] },
        // Zaten learning/review olanlari dahil etme
        status: { notIn: ["LEARNING", "RELEARN", "REVIEW"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    // MASTERED kartlar da havuza eklensin (tekrar amaçlı, düşük öncelik)
    const masteredCards = await db.card.findMany({
      where: {
        deckId: params.id,
        mastery: "MASTERED",
        status: { notIn: ["LEARNING", "RELEARN", "REVIEW"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Öncelik 4: Yeni kartlar (günlük limit kadar)
    // Bugün kaç yeni kart SRS'e tanıtıldı hesapla
    const todayNewIntroduced = await db.review.count({
      where: {
        card: { deckId: params.id, },
        reviewedAt: { gte: todayStart },
        quality: { gte: 3 }, // ilk başarılı review = yeni kartın tanıtılması
      },
    });
    const newCardLimit = Math.max(0, deck.newPerDay - todayNewIntroduced);

    const newCards = await db.card.findMany({
      where: {
        deckId: params.id,
        status: "NEW",
        mastery: "NEW",
      },
      orderBy: { createdAt: "asc" },
      take: newCardLimit,
    });

    // Havuzu birleştir (öncelik sırasıyla)
    const pool = [
      ...learningCards,
      ...reviewCards,
      ...studiedCards,
      ...masteredCards,
      ...newCards,
    ];

    // Limit uygula
    const cards = pool.slice(0, limit);

    // Due count (uyarı banner'ı için)
    const dueCount = learningCards.length + reviewCards.length;

    // Toplam deste bilgisi
    const totalCards = await db.card.count({
      where: { deckId: params.id },
    });

    return NextResponse.json({
      cards,
      dueCount,
      totalCards,
      pool: {
        learning: learningCards.length,
        review: reviewCards.length,
        studied: studiedCards.length,
        mastered: masteredCards.length,
        new: newCards.length,
        total: pool.length,
      },
      deck: {
        id: deck.id,
        name: deck.name,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Smart pool error:", error);
    return NextResponse.json(
      { error: "Kart havuzu yüklenemedi" },
      { status: 500 }
    );
  }
}
