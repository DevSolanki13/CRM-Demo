-- 1. Allow optional lead fields
ALTER TABLE "Lead"
  ALTER COLUMN "isOutbound" DROP NOT NULL,
  ALTER COLUMN "status" DROP NOT NULL;

-- 2. Add recurring lead fields and optional details
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "alternatePhone" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recurrenceFrequency" TEXT,
  ADD COLUMN IF NOT EXISTS "recurrenceDate" TEXT,
  ADD COLUMN IF NOT EXISTS "recurrenceInterval" INTEGER,
  ADD COLUMN IF NOT EXISTS "nextRecurrenceDate" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedDate" TEXT,
  ADD COLUMN IF NOT EXISTS "nextFollowUpDate" TEXT;

-- 3. Add index for recurring lead searches
CREATE INDEX IF NOT EXISTS "Lead_isRecurring_nextRecurrenceDate_idx"
  ON "Lead"("isRecurring", "nextRecurrenceDate");