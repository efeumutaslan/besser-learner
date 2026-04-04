import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { searchImage } from "@/lib/image-search";
import { NextRequest, NextResponse } from "next/server";

// POST - Destedeki imageUrl'i boş olan kartlara Pixabay'dan resim çek
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    // imageUrl'i boş olan kartları bul
    const cardsWithoutImage = await db.card.findMany({
      where: {
        deckId: params.id,
        OR: [{ imageUrl: null }, { imageUrl: "" }],
      },
      select: { id: true, word: true },
    });

    if (cardsWithoutImage.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: "Tüm kartların zaten resmi var",
      });
    }

    let updated = 0;

    for (const card of cardsWithoutImage) {
      const imageUrl = await searchImage(card.word);
      if (imageUrl) {
        await db.card.update({
          where: { id: card.id },
          data: { imageUrl },
        });
        updated++;
      }
      // Rate limit: 100ms arası
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({
      success: true,
      total: cardsWithoutImage.length,
      updated,
      skipped: cardsWithoutImage.length - updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")
    ) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Fetch images error:", error);
    return NextResponse.json(
      { error: "Resimler yüklenemedi" },
      { status: 500 }
    );
  }
}
