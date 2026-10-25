CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationRun_nextRunAt_lockedUntil_idx" ON "AutomationRun"("nextRunAt", "lockedUntil");

CREATE TABLE "AutomationEvent" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "AutomationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationEvent_status_nextRunAt_lockedUntil_idx" ON "AutomationEvent"("status", "nextRunAt", "lockedUntil");
