import { db } from "@/lib/db";
import { requireAuth, verifyPassword, hashPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// PUT - Şifre değiştir
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mevcut şifre ve yeni şifre gerekli" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Yeni şifre en az 6 karakter olmalı" },
        { status: 400 }
      );
    }

    // Mevcut şifreyi doğrula
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    const valid = await verifyPassword(currentPassword, fullUser.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Mevcut şifre hatalı" },
        { status: 401 }
      );
    }

    // Yeni şifreyi hashle ve kaydet
    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Şifre değiştirilemedi" },
      { status: 500 }
    );
  }
}
