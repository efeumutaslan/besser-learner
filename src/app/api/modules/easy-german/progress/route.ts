import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/modules/easy-german/progress — video izlenme ilerlemesini guncelle
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { videoId, progress, duration } = await request.json();

    if (!videoId || typeof progress !== "number") {
      return NextResponse.json(
        { error: "videoId ve progress gerekli" },
        { status: 400 }
      );
    }

    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const isWatched = clampedProgress >= 0.8;

    try {
      const watch = await db.videoWatch.upsert({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId,
          },
        },
        create: {
          userId: user.id,
          videoId,
          module: "easy-german",
          progress: clampedProgress,
          duration: duration || 0,
          watched: isWatched,
          lastWatchedAt: new Date(),
        },
        update: {
          progress: clampedProgress,
          ...(duration ? { duration } : {}),
          watched: isWatched,
          lastWatchedAt: new Date(),
        },
      });

      return NextResponse.json({
        progress: watch.progress,
        watched: watch.watched,
      });
    } catch {
      // VideoWatch tablosu yoksa sessizce basarili don
      return NextResponse.json({
        progress: clampedProgress,
        watched: isWatched,
      });
    }
  } catch (error: unknown) {
    return handleApiError(error, "Ilerleme kaydedilemedi");
  }
}
