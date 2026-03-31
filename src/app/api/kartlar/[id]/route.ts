import { db } from "@/lib/db";
import { requireAuth, requireCardOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Tek kart detayı
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireCardOwnership(params.id, user.id);

    const card = await db.card.findUnique({
      where: { id: params.id },
      include: { deck: true },
    });

    return NextResponse.json(card);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    console.error("Error fetching card:", error);
    return NextResponse.json(
      { error: "Kart yüklenemedi" },
      { status: 500 }
    );
  }
}

// PUT - Kart güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireCardOwnership(params.id, user.id);

    const body = await request.json();

    const card = await db.card.update({
      where: { id: params.id },
      data: {
        ...(body.word !== undefined && { word: body.word.trim() }),
        ...(body.wordTranslation !== undefined && {
          wordTranslation: body.wordTranslation.trim(),
        }),
        ...(body.artikel !== undefined && { artikel: body.artikel || null }),
        ...(body.plural !== undefined && {
          plural: body.plural?.trim() || null,
        }),
        ...(body.nominativ !== undefined && {
          nominativ: body.nominativ?.trim() || null,
        }),
        ...(body.akkusativ !== undefined && {
          akkusativ: body.akkusativ?.trim() || null,
        }),
        ...(body.dativ !== undefined && {
          dativ: body.dativ?.trim() || null,
        }),
        ...(body.exampleSentence !== undefined && {
          exampleSentence: body.exampleSentence?.trim() || null,
        }),
        ...(body.sentenceTranslation !== undefined && {
          sentenceTranslation: body.sentenceTranslation?.trim() || null,
        }),
        ...(body.notes !== undefined && {
          notes: body.notes?.trim() || null,
        }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.wordAudioUrl !== undefined && {
          wordAudioUrl: body.wordAudioUrl,
        }),
        ...(body.sentenceAudioUrl !== undefined && {
          sentenceAudioUrl: body.sentenceAudioUrl,
        }),
      },
    });

    return NextResponse.json(card);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Kart güncellenemedi" },
      { status: 500 }
    );
  }
}

// DELETE - Kart sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireCardOwnership(params.id, user.id);

    await db.card.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Kart silinemedi" },
      { status: 500 }
    );
  }
}
