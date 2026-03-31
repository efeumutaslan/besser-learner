import { db } from "@/lib/db";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: "Kullanici adi ve sifre gerekli" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanici adi veya sifre hatali" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Kullanici adi veya sifre hatali" },
        { status: 401 }
      );
    }

    const token = createToken({ userId: user.id, username: user.username });
    setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Giris yapilamadi" },
      { status: 500 }
    );
  }
}
