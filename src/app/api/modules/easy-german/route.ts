import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { fetchFreshVideos } from "@/lib/easy-german-videos";
import { NextRequest, NextResponse } from "next/server";

// GET /api/modules/easy-german — rastgele video getir (izlenmemisleri oncelikle)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const includeHistory = searchParams.get("history") === "true";

    // Dinamik video listesi (RSS + fallback)
    const allVideos = await fetchFreshVideos();

    // Kullanicinin izledigi videolari getir
    const watches = await db.videoWatch.findMany({
      where: { userId: user.id, module: "easy-german" },
    });

    const watchMap = new Map(watches.map((w) => [w.videoId, w]));

    // Seviye filtresi
    let videos = allVideos;
    if (level) {
      videos = videos.filter((v) => v.level === level);
    }

    // Izlenmemis videolar (watched === false veya hic kaydi yok)
    const unwatched = videos.filter((v) => {
      const watch = watchMap.get(v.id);
      return !watch || !watch.watched;
    });

    // Eger izlenmemis video varsa onlardan, yoksa tumunden rastgele sec
    const pool = unwatched.length > 0 ? unwatched : videos;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];

    if (!selected) {
      return NextResponse.json(
        { error: "Video bulunamadi" },
        { status: 404 }
      );
    }

    const watch = watchMap.get(selected.id);

    const response: Record<string, unknown> = {
      video: {
        ...selected,
        progress: watch?.progress || 0,
        watched: watch?.watched || false,
        lastWatchedAt: watch?.lastWatchedAt || null,
      },
      stats: {
        total: videos.length,
        watched: videos.filter((v) => watchMap.get(v.id)?.watched).length,
        remaining: unwatched.length,
      },
    };

    if (includeHistory) {
      response.history = videos
        .filter((v) => watchMap.has(v.id))
        .map((v) => {
          const w = watchMap.get(v.id)!;
          return {
            ...v,
            progress: w.progress,
            watched: w.watched,
            lastWatchedAt: w.lastWatchedAt,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.lastWatchedAt).getTime() -
            new Date(a.lastWatchedAt).getTime()
        );
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    return handleApiError(error, "Video yuklenemedi");
  }
}
