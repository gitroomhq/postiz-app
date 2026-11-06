-- CreateTable
CREATE TABLE "UserAuthToken" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAuthToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE INDEX "UserAuthToken_userId_purpose_idx" ON "UserAuthToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "UserAuthToken_expiresAt_idx" ON "UserAuthToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserAuthToken" ADD CONSTRAINT "UserAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
