CREATE TABLE "AccountInvitation" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX "AccountInvitation_userId_usedAt_idx" ON "AccountInvitation"("userId", "usedAt");
CREATE INDEX "AccountInvitation_expiresAt_idx" ON "AccountInvitation"("expiresAt");
