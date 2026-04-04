import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
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
    return handleApiError(error, "Istatistikler yuklenemedi");
  }
}
