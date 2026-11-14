-- Add recurring follow-up tracking without deleting or rewriting customer records.
ALTER TABLE "User"
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE "Branding"
  ADD COLUMN "recurringFollowUpDueDays" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "recurringFollowUpReminderDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "recurringFollowUpEscalationDays" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Branding"
  ADD CONSTRAINT "Branding_recurringFollowUpDueDays_check"
    CHECK ("recurringFollowUpDueDays" >= 0),
  ADD CONSTRAINT "Branding_recurringFollowUpReminderDays_check"
    CHECK ("recurringFollowUpReminderDays" > 0),
  ADD CONSTRAINT "Branding_recurringFollowUpEscalationDays_check"
    CHECK ("recurringFollowUpEscalationDays" > 0);

ALTER TABLE "Lead"
  ADD COLUMN "archivedAt" TIMESTAMPTZ;
CREATE INDEX "Lead_archivedAt_idx" ON "Lead"("archivedAt");

ALTER TABLE "LeadRecurrenceCycle"
  ADD COLUMN "cycleNumber" INTEGER;

WITH numbered AS (
  SELECT "id",
    ROW_NUMBER() OVER (PARTITION BY "leadId" ORDER BY "originalDate", "id")::INTEGER AS cycle_number
  FROM "LeadRecurrenceCycle"
)
UPDATE "LeadRecurrenceCycle" AS cycle
SET "cycleNumber" = numbered.cycle_number
FROM numbered
WHERE cycle."id" = numbered."id";

ALTER TABLE "LeadRecurrenceCycle"
  ALTER COLUMN "cycleNumber" SET NOT NULL,
  ADD CONSTRAINT "LeadRecurrenceCycle_cycleNumber_check" CHECK ("cycleNumber" > 0);
CREATE UNIQUE INDEX "LeadRecurrenceCycle_leadId_cycleNumber_key"
  ON "LeadRecurrenceCycle"("leadId", "cycleNumber");

CREATE TABLE "RecurringLeadFollowUp" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "assigneeId" TEXT,
  "assigneeName" TEXT,
  "assigneeTimeZone" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,
  "outcome" TEXT,
  "updateText" TEXT,
  "dealValue" DOUBLE PRECISION,
  "completionDate" TEXT,
  "currentStatus" TEXT,
  "lostReason" TEXT,
  "nextFollowUpDate" TEXT,
  "notes" TEXT,
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "lastReminderDate" TEXT,
  "managerNotifiedAt" TIMESTAMPTZ,
  CONSTRAINT "RecurringLeadFollowUp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringLeadFollowUp_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecurringLeadFollowUp_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "LeadRecurrenceCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecurringLeadFollowUp_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecurringLeadFollowUp_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RecurringLeadFollowUp_cycleNumber_check" CHECK ("cycleNumber" > 0),
  CONSTRAINT "RecurringLeadFollowUp_status_check"
    CHECK ("status" IN ('pending', 'overdue', 'completed', 'cancelled')),
  CONSTRAINT "RecurringLeadFollowUp_outcome_check"
    CHECK ("outcome" IS NULL OR "outcome" IN ('completed', 'not_completed'))
);
CREATE UNIQUE INDEX "RecurringLeadFollowUp_cycleId_key" ON "RecurringLeadFollowUp"("cycleId");
CREATE UNIQUE INDEX "RecurringLeadFollowUp_taskId_key" ON "RecurringLeadFollowUp"("taskId");
CREATE UNIQUE INDEX "RecurringLeadFollowUp_leadId_cycleNumber_key"
  ON "RecurringLeadFollowUp"("leadId", "cycleNumber");
CREATE INDEX "RecurringLeadFollowUp_assigneeId_status_dueDate_idx"
  ON "RecurringLeadFollowUp"("assigneeId", "status", "dueDate");
CREATE INDEX "RecurringLeadFollowUp_leadId_status_cycleNumber_idx"
  ON "RecurringLeadFollowUp"("leadId", "status", "cycleNumber");

CREATE TABLE "LeadHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "leadTitle" TEXT NOT NULL,
  "cycleId" TEXT,
  "followUpId" TEXT,
  "cycleNumber" INTEGER,
  "eventType" TEXT NOT NULL,
  "followUpCreatedAt" TIMESTAMPTZ,
  "dueDate" TEXT,
  "completedAt" TIMESTAMPTZ,
  "outcome" TEXT,
  "updateText" TEXT,
  "dealValue" DOUBLE PRECISION,
  "statusFrom" TEXT,
  "statusTo" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dedupeKey" TEXT NOT NULL,
  CONSTRAINT "LeadHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadHistory_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LeadHistory_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "LeadRecurrenceCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LeadHistory_followUpId_fkey"
    FOREIGN KEY ("followUpId") REFERENCES "RecurringLeadFollowUp"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LeadHistory_cycleNumber_check" CHECK ("cycleNumber" IS NULL OR "cycleNumber" > 0)
);
CREATE INDEX "LeadHistory_leadId_timestamp_idx" ON "LeadHistory"("leadId", "timestamp");
CREATE INDEX "LeadHistory_leadId_cycleNumber_timestamp_idx" ON "LeadHistory"("leadId", "cycleNumber", "timestamp");
CREATE INDEX "LeadHistory_leadId_outcome_timestamp_idx" ON "LeadHistory"("leadId", "outcome", "timestamp");
CREATE UNIQUE INDEX "LeadHistory_dedupeKey_key" ON "LeadHistory"("dedupeKey");

CREATE FUNCTION prevent_lead_history_mutation() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Lead history is append-only; create a correction event instead.';
END;
$$;

CREATE TRIGGER "LeadHistory_append_only"
  BEFORE UPDATE OR DELETE ON "LeadHistory"
  FOR EACH ROW EXECUTE FUNCTION prevent_lead_history_mutation();

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMPTZ,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserNotification_dedupeKey_key" ON "UserNotification"("dedupeKey");
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx"
  ON "UserNotification"("userId", "readAt", "createdAt");

-- Application access is enforced by the server; direct browser access stays denied.
ALTER TABLE "RecurringLeadFollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeadHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RecurringLeadFollowUp" FROM anon, authenticated;
REVOKE ALL ON TABLE "LeadHistory" FROM anon, authenticated;
REVOKE ALL ON TABLE "UserNotification" FROM anon, authenticated;
