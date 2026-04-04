import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextResponse } from "next/server";

// GET - Kullanıcının tüm verilerini JSON olarak dışa aktar
export async function GET() {
  try {
    const user = await requireAuth();

    const decks = await db.deck.findMany({
      where: { userId: user.id },
      include: {
        cards: {
          select: {
            word: true,
            wordTranslation: true,
            artikel: true,
            plural: true,
            nominativ: true,
            akkusativ: true,
            dativ: true,
            exampleSentence: true,
            sentenceTranslation: true,
            notes: true,
            imageUrl: true,
            wordAudioUrl: true,
            sentenceAudioUrl: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const exportData = {
      version: "1.0",
      app: "BesserLernen",
      exportedAt: new Date().toISOString(),
      decks: decks.map((deck) => ({
        name: deck.name,
        description: deck.description,
        color: deck.color,
        cards: deck.cards,
      })),
    };

    const today = new Date().toISOString().split("T")[0];
    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="besserlernen-export-${today}.json"`,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "Disa aktarma basarisiz");
  }
}
