-- InstalledModule tablosu (kullanicinin yukledigi moduller)
CREATE TABLE "InstalledModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstalledModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstalledModule_userId_moduleId_key" ON "InstalledModule"("userId", "moduleId");
CREATE INDEX "InstalledModule_userId_idx" ON "InstalledModule"("userId");

ALTER TABLE "InstalledModule" ADD CONSTRAINT "InstalledModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
