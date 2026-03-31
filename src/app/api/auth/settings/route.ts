import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Ayarlar yüklenemedi" },
      { status: 500 }
    );
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Ayarlar güncellenemedi" },
      { status: 500 }
    );
  }
}
