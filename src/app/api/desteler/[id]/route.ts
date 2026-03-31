import { db } from "@/lib/db";
import { requireAuth, requireDeckOwnership } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Tek deste detayı
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    const deck = await db.deck.findUnique({
      where: { id: params.id },
      include: {
        cards: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Deste bulunamadı" },
        { status: 404 }
      );
    }

    const now = new Date();
    const stats = {
      total: deck._count.cards,
      new: deck.cards.filter((c) => c.status === "NEW").length,
      learning: deck.cards.filter(
        (c) => c.status === "LEARNING" || c.status === "RELEARN"
      ).length,
      review: deck.cards.filter(
        (c) => c.status === "REVIEW" && new Date(c.dueDate) <= now
      ).length,
      mature: deck.cards.filter(
        (c) => c.status === "REVIEW" && c.interval >= 21
      ).length,
    };

    return NextResponse.json({ ...deck, stats });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error fetching deck:", error);
    return NextResponse.json(
      { error: "Deste yüklenemedi" },
      { status: 500 }
    );
  }
}

// PUT - Deste güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    const body = await request.json();
    const { name, description, color, newPerDay, reviewPerDay } = body;

    const deck = await db.deck.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(color !== undefined && { color }),
        ...(newPerDay !== undefined && { newPerDay }),
        ...(reviewPerDay !== undefined && { reviewPerDay }),
      },
    });

    return NextResponse.json(deck);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error updating deck:", error);
    return NextResponse.json(
      { error: "Deste güncellenemedi" },
      { status: 500 }
    );
  }
}

// DELETE - Deste sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await requireDeckOwnership(params.id, user.id);

    await db.deck.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    if (error instanceof Error && (error.message === "NOT_FOUND" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Deste bulunamadı" }, { status: 404 });
    }
    console.error("Error deleting deck:", error);
    return NextResponse.json(
      { error: "Deste silinemedi" },
      { status: 500 }
    );
  }
}
