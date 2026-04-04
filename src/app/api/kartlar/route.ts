import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { searchImage } from "@/lib/image-search";
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

    // imageUrl yoksa Pixabay'dan otomatik çek
    let resolvedImageUrl = imageUrl || null;
    if (!resolvedImageUrl) {
      resolvedImageUrl = await searchImage(word.trim());
    }

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
        imageUrl: resolvedImageUrl,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "Kart olusturulamadi");
  }
}
