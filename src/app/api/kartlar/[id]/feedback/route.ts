import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { calculateNextReview } from "@/lib/srs";
import { parseDeckSettings } from "@/lib/srs-settings";
import { getNextMastery, type MasteryLevel } from "@/lib/gamification";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// POST - Fun modlardan SRS geri bildirimi
// Mastery her zaman guncellenir, SRS gunde 1 kez uygulanir (dedup)
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

    // 1. Mastery her zaman guncellenir
    const masteryResult = getNextMastery(
      card.mastery as MasteryLevel,
      isCorrect,
      card.correctHits
    );

    // 2. SRS gunde 1 kez uygulanir
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayFeedbackCount = await db.review.count({
      where: {
        cardId: params.id,
        reviewedAt: { gte: todayStart },
      },
    });

    const shouldApplySRS = todayFeedbackCount === 0;

    let srsUpdate: Record<string, unknown> = {};

    if (shouldApplySRS) {
      // Deck SRS ayarlarini al
      const deck = await db.deck.findUnique({
        where: { id: card.deckId },
      });
      const settings = parseDeckSettings(deck ?? {});

      if (card.status === "NEW") {
        if (isCorrect) {
          // NEW + dogru -> ogrenme adimina al
          const steps = settings.learningSteps;
          srsUpdate = {
            status: "LEARNING",
            dueDate: new Date(Date.now() + (steps[0] ?? 1) * 60 * 1000),
            repetitions: 0,
            interval: 0,
            learningStep: 0,
          };
        }
        // NEW + yanlis -> SRS degismez, sadece mastery SEEN olur
      } else {
        // LEARNING/REVIEW/RELEARN kartlar icin soft SRS rating
        const rating = isCorrect ? "good" : "again";
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
        srsUpdate = {
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          dueDate: result.dueDate,
          status: result.status,
          lapses: result.lapses,
          learningStep: result.learningStep,
        };
      }
    }

    // Kart guncelle
    const updatedCard = await db.card.update({
      where: { id: params.id },
      data: {
        mastery: masteryResult.mastery,
        correctHits: masteryResult.correctHits,
        ...srsUpdate,
      },
    });

    // SRS uygulandiysa review kaydi olustur
    if (shouldApplySRS && (card.status !== "NEW" || isCorrect)) {
      await db.review.create({
        data: {
          cardId: params.id,
          quality: isCorrect ? 4 : 0,
          interval: typeof srsUpdate.interval === "number"
            ? srsUpdate.interval as number
            : card.interval,
          easeFactor: typeof srsUpdate.easeFactor === "number"
            ? srsUpdate.easeFactor as number
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
    return handleApiError(error, "Geri bildirim kaydedilemedi");
  }
}
