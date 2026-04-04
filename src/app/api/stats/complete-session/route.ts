import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import {
  calculateSessionXP,
  calculateStreak,
  getStreakBonus,
  getTodayStr,
} from "@/lib/gamification";
import { NextRequest, NextResponse } from "next/server";

// POST - Oturum tamamlandığında XP/Gem/Streak güncelle
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      deckId,
      type,
      cardsStudied,
      correctCount,
      wrongCount,
      duration,
      feedback,
    } = body;

    // Deste sahiplik kontrolü
    await requireDeckOwnership(deckId, user.id);

    const isPerfect = wrongCount === 0 && correctCount > 0;
    const noMistakes = wrongCount === 0;

    // XP ve Gem hesapla
    const { xp, gems } = calculateSessionXP({
      type,
      correctCount: correctCount || 0,
      wrongCount: wrongCount || 0,
      totalCards: cardsStudied || 0,
      isPerfect,
      noMistakes,
    });

    // UserStats güncelle (userId ile)
    let userStats = await db.userStats.findUnique({
      where: { userId: user.id },
    });

    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId: user.id },
      });
    }

    // Streak hesapla
    const streakResult = calculateStreak(
      userStats.lastStudyDate,
      userStats.currentStreak
    );

    const streakBonusXP = streakResult.isNewDay
      ? getStreakBonus(streakResult.newStreak)
      : 0;

    const totalXP = xp + streakBonusXP;
    const today = getTodayStr();

    // Transaction: Session + UserStats + DailyActivity güncelle
    const [session] = await db.$transaction([
      // StudySession kaydet
      db.studySession.create({
        data: {
          userId: user.id,
          deckId,
          type,
          cardsStudied: cardsStudied || 0,
          correctCount: correctCount || 0,
          xpEarned: totalXP,
          gemsEarned: gems,
          duration: duration || 0,
          completedAt: new Date(),
          feedback: feedback || null,
        },
      }),

      // UserStats güncelle
      db.userStats.update({
        where: { userId: user.id },
        data: {
          totalXp: { increment: totalXP },
          totalGems: { increment: gems },
          currentStreak: streakResult.newStreak,
          longestStreak: Math.max(
            userStats.longestStreak,
            streakResult.newStreak
          ),
          lastStudyDate: today,
          totalSessions: { increment: 1 },
          totalCards: { increment: cardsStudied || 0 },
        },
      }),

      // DailyActivity upsert
      db.dailyActivity.upsert({
        where: {
          userId_date: { userId: user.id, date: today },
        },
        create: {
          userId: user.id,
          date: today,
          cardsReviewed: type === "review" ? (cardsStudied || 0) : 0,
          cardsLearned: type !== "review" ? (cardsStudied || 0) : 0,
          correctCount: correctCount || 0,
          wrongCount: wrongCount || 0,
          xpEarned: totalXP,
          gemsEarned: gems,
          totalTime: duration || 0,
          sessionsCount: 1,
        },
        update: {
          cardsReviewed: {
            increment: type === "review" ? (cardsStudied || 0) : 0,
          },
          cardsLearned: {
            increment: type !== "review" ? (cardsStudied || 0) : 0,
          },
          correctCount: { increment: correctCount || 0 },
          wrongCount: { increment: wrongCount || 0 },
          xpEarned: { increment: totalXP },
          gemsEarned: { increment: gems },
          totalTime: { increment: duration || 0 },
          sessionsCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      session,
      rewards: {
        xp: totalXP,
        gems,
        streakBonusXP,
        streak: streakResult.newStreak,
        isNewDay: streakResult.isNewDay,
        streakBroken: streakResult.streakBroken,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "Oturum kaydedilemedi");
  }
}
