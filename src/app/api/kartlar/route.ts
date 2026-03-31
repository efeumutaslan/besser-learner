import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST - Yeni kart oluştur
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      deckId,
      word,
      wordTranslation,
      artikel,
      plural,
      nominativ,
      akkusativ,
      dativ,
      exampleSentence,
      sentenceTranslation,
      notes,
      imageUrl,
    } = body;

    if (!deckId || !word?.trim() || !wordTranslation?.trim()) {
      return NextResponse.json(
        { error: "Deste ID, kelime ve çevirisi gerekli" },
        { status: 400 }
      );
    }

    // Deste sahiplik kontrolü
    await requireDeckOwnership(deckId, user.id);

    const card = await db.card.create({
      data: {
        deckId,
        word: word.trim(),
        wordTranslation: wordTranslation.trim(),
        artikel: artikel || null,
        plural: plural?.trim() || null,
        nominativ: nominativ?.trim() || null,
        akkusativ: akkusativ?.trim() || null,
        dativ: dativ?.trim() || null,
        exampleSentence: exampleSentence?.trim() || null,
        sentenceTranslation: sentenceTranslation?.trim() || null,
        notes: notes?.trim() || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error creating card:", error);
    return NextResponse.json(
      { error: "Kart oluşturulamadı" },
      { status: 500 }
    );
  }
}
