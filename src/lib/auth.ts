import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required. Set it in your .env file.");
  }
  return secret;
}
const TOKEN_NAME = "bl_token";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 gun

export interface JWTPayload {
  userId: string;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_MAX_AGE });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

export function removeAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_NAME);
}

export function getAuthToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

// API route'larinda kullanilacak - mevcut kullaniciyi getir
export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, displayName: true, theme: true },
  });

  return user;
}

// API route'larinda zorunlu auth kontrolu
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

// Deste sahiplik kontrolu - deck'in bu userId'ye ait olduğunu doğrula
export async function requireDeckOwnership(deckId: string, userId: string) {
  const deck = await db.deck.findUnique({
    where: { id: deckId },
    select: { id: true, userId: true },
  });
  if (!deck) {
    throw new Error("NOT_FOUND");
  }
  if (deck.userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  return deck;
}

// Kart sahiplik kontrolu - card -> deck -> userId zinciriyle doğrula
export async function requireCardOwnership(cardId: string, userId: string) {
  const card = await db.card.findUnique({
    where: { id: cardId },
    include: { deck: { select: { userId: true } } },
  });
  if (!card) {
    throw new Error("NOT_FOUND");
  }
  if (card.deck.userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  return card;
}
