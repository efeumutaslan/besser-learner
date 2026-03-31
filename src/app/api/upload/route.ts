import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadToGitHub, isGitHubStorageConfigured } from "@/lib/github-storage";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

function generateFileName(originalName: string, mimeType: string): string {
  const ext = ALLOWED_TYPES[mimeType] || originalName.split(".").pop() || "bin";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function getFolder(mimeType: string): string {
  return mimeType.startsWith("image/") ? "images" : "audio";
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Desteklenmeyen dosya tipi" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = generateFileName(file.name, file.type);
    const folder = getFolder(file.type);

    // GitHub storage yapilandirildiysa GitHub'a yukle, degilse locale kaydet
    if (isGitHubStorageConfigured()) {
      const url = await uploadToGitHub(buffer, fileName, folder);
      return NextResponse.json({ url, name: fileName, storage: "github" });
    }

    // Fallback: local storage
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url, name: fileName, storage: "local" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Dosya yüklenemedi" },
      { status: 500 }
    );
  }
}
