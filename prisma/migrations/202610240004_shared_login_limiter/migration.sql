CREATE TABLE "LoginAttempt" (
    "keyHash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "LoginAttempt_windowEndsAt_idx" ON "LoginAttempt"("windowEndsAt");
