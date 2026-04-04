import { NextResponse } from "next/server";

/**
 * API route'larinda tekrarlanan hata yonetimini merkezilestiren utility.
 * Kullanim:
 *   catch (error: unknown) { return handleApiError(error, "Deste yuklenemedi"); }
 */
export function handleApiError(error: unknown, fallbackMessage = "Bir hata olustu"): NextResponse {
  if (error instanceof Error) {
    switch (error.message) {
      case "UNAUTHORIZED":
        return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 401 });
      case "NOT_FOUND":
      case "FORBIDDEN":
        return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
    }
  }
  console.error(fallbackMessage + ":", error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
