import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// GET - Kullanıcı ayarlarını getir
export async function GET() {
  try {
    const user = await requireAuth();

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        displayName: true,
        theme: true,
        defaultNewPerDay: true,
        defaultReviewPerDay: true,
      },
    });

    return NextResponse.json(fullUser);
  } catch (error: unknown) {
    return handleApiError(error, "Ayarlar yuklenemedi");
  }
}

// PUT - Kullanıcı ayarlarını güncelle
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { displayName, theme, defaultNewPerDay, defaultReviewPerDay } = body;

    const data: Record<string, unknown> = {};
    if (displayName !== undefined) data.displayName = displayName?.trim() || null;
    if (theme !== undefined && (theme === "light" || theme === "dark")) data.theme = theme;
    if (defaultNewPerDay !== undefined && defaultNewPerDay >= 1 && defaultNewPerDay <= 999) {
      data.defaultNewPerDay = defaultNewPerDay;
    }
    if (defaultReviewPerDay !== undefined && defaultReviewPerDay >= 1 && defaultReviewPerDay <= 9999) {
      data.defaultReviewPerDay = defaultReviewPerDay;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        displayName: true,
        theme: true,
        defaultNewPerDay: true,
        defaultReviewPerDay: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return handleApiError(error, "Ayarlar guncellenemedi");
  }
}
