import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  try {
    // Prisma warm-up: ilk sorgu cold start'i tetikler
    // Health check'leri bunu periyodik cagirarak cold start'i onler
    await db.$queryRaw`SELECT 1`;

    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      dbLatencyMs: dbLatency,
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 }
    );
  }
}
