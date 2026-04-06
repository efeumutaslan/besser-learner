-- VideoWatch tablosu (Easy German modul izlenme takibi)
CREATE TABLE "VideoWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoWatch_pkey" PRIMARY KEY ("id")
);

-- Unique: bir kullanici bir videoyu bir kez izleyebilir
CREATE UNIQUE INDEX "VideoWatch_userId_videoId_key" ON "VideoWatch"("userId", "videoId");

-- Index: modüle göre kullanıcı videoları
CREATE INDEX "VideoWatch_userId_module_idx" ON "VideoWatch"("userId", "module");

-- Foreign key
ALTER TABLE "VideoWatch" ADD CONSTRAINT "VideoWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
