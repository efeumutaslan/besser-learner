import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { calculateNextReview } from "@/lib/srs";
import { getNextMastery, type MasteryLevel } from "@/lib/gamification";
import { NextRequest, NextResponse } from "next/server";

// POST - Fun modlardan SRS geri bildirimi
// Mastery her zaman güncellenir, SRS günde 1 kez uygulanır (dedup)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const card = await requireCardOwnership(params.id, user.id);
    const body = await request.json();
    const { isCorrect, source } = body as {
      isCorrect: boolean;
      source: "learn" | "test" | "match" | "blast";
    };

    if (typeof isCorrect !== "boolean" || !source) {
      return NextResponse.json(
        { error: "isCorrect (boolean) ve source gerekli" },
        { status: 400 }
      );
    }

    // 1. Mastery her zaman güncellenir
    const masteryResult = getNextMastery(
      card.mastery as MasteryLevel,
      isCorrect,
      card.correctHits
    );

    // 2. SRS günde 1 kez uygulanır (aynı gün aynı karttan tekrar feedback gelirse sadece mastery güncelle)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayFeedbackCount = await db.review.count({
      where: {
        cardId: params.id,
        reviewedAt: { gte: todayStart },
      },
    });

    const shouldApplySRS = todayFeedbackCount === 0;

    let srsUpdate = {};

    if (shouldApplySRS) {
      if (card.status === "NEW") {
        if (isCorrect) {
          // NEW + doğru → SRS'e tanıt (LEARNING)
          srsUpdate = {
            status: "LEARNING",
            dueDate: new Date(Date.now() + 10 * 60 * 1000), // 10dk sonra
            repetitions: 0,
            interval: 0,
          };
        }
        // NEW + yanlış → SRS değişmez, sadece mastery SEEN olur (yukarıda zaten)
      } else {
        // LEARNING/REVIEW/RELEARN kartlar için soft SRS rating
        const rating = isCorrect ? "good" : "again";
        const result = calculateNextReview(
          {
            interval: card.interval,
            repetitions: card.repetitions,
            easeFactor: card.easeFactor,
            lapses: card.lapses,
          },
          rating
        );
        srsUpdate = {
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          dueDate: result.dueDate,
          status: result.status,
          lapses: result.lapses,
        };
      }
    }

    // Kart güncelle
    const updatedCard = await db.card.update({
      where: { id: params.id },
      data: {
        mastery: masteryResult.mastery,
        correctHits: masteryResult.correctHits,
        ...srsUpdate,
      },
    });

    // SRS uygulandıysa review kaydı oluştur
    if (shouldApplySRS && (card.status !== "NEW" || isCorrect)) {
      await db.review.create({
        data: {
          cardId: params.id,
          quality: isCorrect ? 4 : 0,
          interval: typeof (srsUpdate as Record<string, unknown>).interval === "number"
            ? (srsUpdate as Record<string, unknown>).interval as number
            : card.interval,
          easeFactor: typeof (srsUpdate as Record<string, unknown>).easeFactor === "number"
            ? (srsUpdate as Record<string, unknown>).easeFactor as number
            : card.easeFactor,
        },
      });
    }

    return NextResponse.json({
      card: updatedCard,
      mastery: masteryResult.mastery,
      correctHits: masteryResult.correctHits,
      srsApplied: shouldApplySRS,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Geri bildirim kaydedilemedi" },
      { status: 500 }
    );
  }
}
