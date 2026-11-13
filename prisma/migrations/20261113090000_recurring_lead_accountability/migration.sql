-- Additive migration: preserve existing lead dates and customer history.
ALTER TABLE "Lead"
  ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "recurrencePaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrencePauseReason" TEXT,
  ADD COLUMN "lastRecurringReviewDate" TEXT,
  ADD COLUMN "recurrenceState" TEXT NOT NULL DEFAULT 'awaiting';

CREATE TABLE "LeadRecurrenceCycle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "originalDate" TEXT NOT NULL,
  "expectedDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'awaiting',
  "nextActionDate" TEXT,
  "note" TEXT,
  "reviewedAt" TEXT,
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "confirmedDealId" TEXT REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TEXT NOT NULL,
  CONSTRAINT "LeadRecurrenceCycle_status_check" CHECK ("status" IN ('awaiting','attempted','confirmed','postponed','not_buying','purchased'))
);
CREATE UNIQUE INDEX "LeadRecurrenceCycle_leadId_originalDate_key" ON "LeadRecurrenceCycle"("leadId", "originalDate");
CREATE INDEX "LeadRecurrenceCycle_leadId_status_expectedDate_idx" ON "LeadRecurrenceCycle"("leadId", "status", "expectedDate");
CREATE INDEX "LeadRecurrenceCycle_status_expectedDate_idx" ON "LeadRecurrenceCycle"("status", "expectedDate");
CREATE INDEX "LeadRecurrenceCycle_confirmedDealId_idx" ON "LeadRecurrenceCycle"("confirmedDealId");

-- This CRM uses server-side Prisma authorization, not direct browser table access.
ALTER TABLE "LeadRecurrenceCycle" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LeadRecurrenceCycle" FROM anon, authenticated;
