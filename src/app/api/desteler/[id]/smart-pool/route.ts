import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

    const deck = await db.deck.findUnique({
      where: { id: params.id },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Deste bulunamadı" },
        { status: 404 }
      );
    }

    // Fun modlar (test, blast, match, learn, artikel, cloze, grammar)
    // SRS limitleri/due date'ler burada UYGULANMAZ — tüm kartları döner.
    // SRS kuyruğu ayrı bir endpoint: /api/calisma/[deckId]
    //
    // Öncelik sırası: son çalışılan > eski > yeni (ama hepsi dahil)
    const allCards = await db.card.findMany({
      where: { deckId: params.id },
      orderBy: [
        { updatedAt: "desc" },
      ],
      take: limit,
    });

    // Due count (uyarı banner'ı için — SRS tekrarı bekleyenler)
    const now = new Date();
    const dueCount = await db.card.count({
      where: {
        deckId: params.id,
        status: { in: ["LEARNING", "RELEARN", "REVIEW"] },
        dueDate: { lte: now },
      },
    });

    return NextResponse.json({
      cards: allCards,
      dueCount,
      totalCards: allCards.length,
      deck: {
        id: deck.id,
        name: deck.name,
        newPerDay: deck.newPerDay,
        reviewPerDay: deck.reviewPerDay,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "Kart havuzu yuklenemedi");
  }
}
