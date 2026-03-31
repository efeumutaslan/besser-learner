import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Kullanıcı istatistiklerini getir
export async function GET() {
  try {
    const user = await requireAuth();

    // Kullanıcının UserStats'ını getir veya oluştur
    let stats = await db.userStats.findUnique({
      where: { userId: user.id },
    });

    if (!stats) {
      stats = await db.userStats.create({
        data: { userId: user.id },
      });
    }

    // Son 7 günlük aktivite
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;

    const recentActivity = await db.dailyActivity.findMany({
      where: {
        userId: user.id,
        date: { gte: dateStr },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ stats, recentActivity });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "İstatistikler yüklenemedi" },
      { status: 500 }
    );
  }
}
