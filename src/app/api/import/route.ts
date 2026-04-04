import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

const VALID_ARTIKELS = ["der", "die", "das"];
const MAX_DECKS = 100;
const MAX_CARDS_PER_DECK = 5000;

interface ImportCard {
  word: string;
  wordTranslation: string;
  artikel?: string | null;
  plural?: string | null;
  nominativ?: string | null;
  akkusativ?: string | null;
  dativ?: string | null;
  exampleSentence?: string | null;
  sentenceTranslation?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  wordAudioUrl?: string | null;
  sentenceAudioUrl?: string | null;
}

interface ImportDeck {
  name: string;
  description?: string | null;
  color?: string;
  cards: ImportCard[];
}

interface ImportData {
  version?: string;
  decks: ImportDeck[];
}

// POST - JSON dosyasından veri içe aktar
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Body boyutu kontrolü (5MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya boyutu 5MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    let data: ImportData;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Geçersiz JSON formatı" },
        { status: 400 }
      );
    }

    // Temel validasyon
    if (!data.decks || !Array.isArray(data.decks)) {
      return NextResponse.json(
        { error: "JSON dosyasında 'decks' dizisi bulunamadı" },
        { status: 400 }
      );
    }

    if (data.decks.length > MAX_DECKS) {
      return NextResponse.json(
        { error: `En fazla ${MAX_DECKS} deste içe aktarılabilir` },
        { status: 400 }
      );
    }

    // Mevcut deste isimlerini al (kopya kontrolü için)
    const existingDecks = await db.deck.findMany({
      where: { userId: user.id },
      select: { name: true },
    });
    const existingNames = new Set(existingDecks.map((d) => d.name));

    let totalDecksImported = 0;
    let totalCardsImported = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.decks.length; i++) {
      const deck = data.decks[i];

      // Deste validasyonu
      if (!deck.name?.trim()) {
        errors.push(`Deste ${i + 1}: İsim gerekli`);
        continue;
      }

      if (!deck.cards || !Array.isArray(deck.cards)) {
        errors.push(`"${deck.name}": Kart dizisi bulunamadı`);
        continue;
      }

      if (deck.cards.length > MAX_CARDS_PER_DECK) {
        errors.push(
          `"${deck.name}": En fazla ${MAX_CARDS_PER_DECK} kart olabilir`
        );
        continue;
      }

      // Kart validasyonu
      const validCards: ImportCard[] = [];
      for (let j = 0; j < deck.cards.length; j++) {
        const card = deck.cards[j];
        if (!card.word?.trim() || !card.wordTranslation?.trim()) {
          errors.push(
            `"${deck.name}" - Kart ${j + 1}: Kelime ve çevirisi gerekli`
          );
          continue;
        }

        // Artikel validasyonu
        if (card.artikel && !VALID_ARTIKELS.includes(card.artikel.toLowerCase())) {
          errors.push(
            `"${deck.name}" - Kart ${j + 1}: Geçersiz artikel "${card.artikel}" (der/die/das olmalı)`
          );
          continue;
        }

        validCards.push(card);
      }

      if (validCards.length === 0) {
        errors.push(`"${deck.name}": Geçerli kart bulunamadı`);
        continue;
      }

      // Deste adı çakışma kontrolü
      let deckName = deck.name.trim();
      if (existingNames.has(deckName)) {
        deckName = `${deckName} (Kopya)`;
        // Hala çakışıyorsa numara ekle
        let counter = 2;
        while (existingNames.has(deckName)) {
          deckName = `${deck.name.trim()} (Kopya ${counter})`;
          counter++;
        }
      }
      existingNames.add(deckName);

      // Transaction: Deste + kartlar oluştur
      await db.$transaction(async (tx) => {
        const newDeck = await tx.deck.create({
          data: {
            userId: user.id,
            name: deckName,
            description: deck.description?.trim() || null,
            color: deck.color || "#6366F1",
          },
        });

        await tx.card.createMany({
          data: validCards.map((card) => ({
            deckId: newDeck.id,
            word: card.word.trim(),
            wordTranslation: card.wordTranslation.trim(),
            artikel: card.artikel?.toLowerCase() || null,
            plural: card.plural?.trim() || null,
            nominativ: card.nominativ?.trim() || null,
            akkusativ: card.akkusativ?.trim() || null,
            dativ: card.dativ?.trim() || null,
            exampleSentence: card.exampleSentence?.trim() || null,
            sentenceTranslation: card.sentenceTranslation?.trim() || null,
            notes: card.notes?.trim() || null,
            imageUrl: card.imageUrl?.trim() || null,
            wordAudioUrl: card.wordAudioUrl?.trim() || null,
            sentenceAudioUrl: card.sentenceAudioUrl?.trim() || null,
          })),
        });

        totalCardsImported += validCards.length;
      });

      totalDecksImported++;
    }

    return NextResponse.json({
      success: true,
      imported: {
        decks: totalDecksImported,
        cards: totalCardsImported,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    return handleApiError(error, "Ice aktarma basarisiz");
  }
}
