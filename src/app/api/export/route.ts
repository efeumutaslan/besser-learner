import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Dışa aktarma başarısız" },
      { status: 500 }
    );
  }
}
