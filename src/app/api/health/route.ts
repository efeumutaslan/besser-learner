import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // DB baglantisini kontrol et
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 }
    );
  }
}
