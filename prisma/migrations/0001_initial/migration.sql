-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "defaultNewPerDay" INTEGER NOT NULL DEFAULT 20,
    "defaultReviewPerDay" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "newPerDay" INTEGER NOT NULL DEFAULT 20,
    "reviewPerDay" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "wordTranslation" TEXT NOT NULL,
    "artikel" TEXT,
    "plural" TEXT,
    "nominativ" TEXT,
    "akkusativ" TEXT,
    "dativ" TEXT,
    "exampleSentence" TEXT,
    "sentenceTranslation" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "wordAudioUrl" TEXT,
    "sentenceAudioUrl" TEXT,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "buried" BOOLEAN NOT NULL DEFAULT false,
    "mastery" TEXT NOT NULL DEFAULT 'NEW',
    "correctHits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "interval" INTEGER NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cardsStudied" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "gemsEarned" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "totalGems" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TEXT,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
    "cardsLearned" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "gemsEarned" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");

-- CreateIndex
CREATE INDEX "Card_deckId_idx" ON "Card"("deckId");
CREATE INDEX "Card_dueDate_idx" ON "Card"("dueDate");
CREATE INDEX "Card_status_idx" ON "Card"("status");

-- CreateIndex
CREATE INDEX "Review_cardId_idx" ON "Review"("cardId");
CREATE INDEX "Review_reviewedAt_idx" ON "Review"("reviewedAt");

-- CreateIndex
CREATE INDEX "StudySession_deckId_idx" ON "StudySession"("deckId");
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_idx" ON "DailyActivity"("userId");
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
