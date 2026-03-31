import { db } from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, displayName } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: "Kullanici adi ve sifre gerekli" },
        { status: 400 }
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: "Kullanici adi en az 3 karakter olmali" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Sifre en az 6 karakter olmali" },
        { status: 400 }
      );
    }

    // Kullanici adi kontrolu
    const existing = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu kullanici adi zaten kullaniliyor" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        displayName: displayName?.trim() || username.trim(),
      },
    });

    // UserStats olustur
    await db.userStats.create({
      data: { userId: user.id },
    });

    const token = createToken({ userId: user.id, username: user.username });
    setAuthCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Kayit olusturulamadi" },
      { status: 500 }
    );
  }
}
