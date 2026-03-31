import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteFromGitHub, isGitHubStorageConfigured } from "@/lib/github-storage";
import { unlink } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { urls } = await request.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    let deleted = 0;

    for (const url of urls) {
      if (typeof url !== "string" || !url) continue;

      try {
        if (url.startsWith("https://raw.githubusercontent.com/") && isGitHubStorageConfigured()) {
          await deleteFromGitHub(url);
          deleted++;
        } else if (url.startsWith("/uploads/")) {
          const filePath = path.join(process.cwd(), "public", url);
          await unlink(filePath).catch(() => {});
          deleted++;
        }
      } catch {
        // Tek dosya silinmezse devam et
      }
    }

    return NextResponse.json({ deleted });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
  }
}
