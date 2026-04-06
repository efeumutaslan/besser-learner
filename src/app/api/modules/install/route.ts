import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_MODULES = ["easy-german"];

// GET /api/modules/install — kullanicinin yuklu modullerini getir
export async function GET() {
  try {
    const user = await requireAuth();

    let modules: { moduleId: string; createdAt: Date }[] = [];
    try {
      modules = await db.installedModule.findMany({
        where: { userId: user.id },
        select: { moduleId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      // Tablo henuz olusturulmamis olabilir
    }

    return NextResponse.json({
      modules: modules.map((m) => m.moduleId),
    });
  } catch (error: unknown) {
    return handleApiError(error, "Moduller yuklenemedi");
  }
}

// POST /api/modules/install — modul yukle
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { moduleId } = await request.json();

    if (!moduleId || !VALID_MODULES.includes(moduleId)) {
      return NextResponse.json(
        { error: "Gecersiz modul" },
        { status: 400 }
      );
    }

    await db.installedModule.upsert({
      where: {
        userId_moduleId: { userId: user.id, moduleId },
      },
      create: { userId: user.id, moduleId },
      update: {},
    });

    return NextResponse.json({ installed: true, moduleId });
  } catch (error: unknown) {
    return handleApiError(error, "Modul yuklenemedi");
  }
}

// DELETE /api/modules/install — modul kaldir
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json(
        { error: "moduleId gerekli" },
        { status: 400 }
      );
    }

    await db.installedModule.deleteMany({
      where: { userId: user.id, moduleId },
    });

    return NextResponse.json({ installed: false, moduleId });
  } catch (error: unknown) {
    return handleApiError(error, "Modul kaldirilamadi");
  }
}
