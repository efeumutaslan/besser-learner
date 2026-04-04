import { db } from "@/lib/db";
import { requireAuth, removeAuthCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// POST - SRS ilerlemesini sıfırla (kartları koru)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { confirm } = body;

    if (confirm !== "SIFIRLA") {
      return NextResponse.json(
        { error: "Onay metni gerekli" },
        { status: 400 }
      );
    }

    // Kullanıcının tüm kartlarını bul
    const decks = await db.deck.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const deckIds = decks.map((d) => d.id);

    await db.$transaction([
      // Tüm kartları varsayılan SRS değerlerine döndür
      db.card.updateMany({
        where: { deckId: { in: deckIds } },
        data: {
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
          dueDate: new Date(),
          status: "NEW",
          lapses: 0,
          mastery: "NEW",
          correctHits: 0,
        },
      }),
      // Review geçmişini sil
      db.review.deleteMany({
        where: { card: { deckId: { in: deckIds } } },
      }),
      // Oturumları sil
      db.studySession.deleteMany({
        where: { userId: user.id },
      }),
      // Günlük aktiviteleri sil
      db.dailyActivity.deleteMany({
        where: { userId: user.id },
      }),
      // Stats sıfırla
      db.userStats.update({
        where: { userId: user.id },
        data: {
          totalXp: 0,
          totalGems: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
          totalCards: 0,
          totalSessions: 0,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, "Sifirlama basarisiz");
  }
}

// DELETE - Tüm kullanıcı verisini sil
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { confirm } = body;

    if (confirm !== "SIL") {
      return NextResponse.json(
        { error: "Onay metni gerekli" },
        { status: 400 }
      );
    }

    // Cascade delete ile tüm veriler silinir
    await db.user.delete({
      where: { id: user.id },
    });

    removeAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, "Hesap silinemedi");
  }
}
