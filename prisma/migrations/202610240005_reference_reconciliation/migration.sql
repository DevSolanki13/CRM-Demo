CREATE TABLE "OrphanReference" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrphanReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrphanReference_recordType_recordId_field_key"
  ON "OrphanReference"("recordType", "recordId", "field");
CREATE INDEX "OrphanReference_targetType_targetId_idx"
  ON "OrphanReference"("targetType", "targetId");

INSERT INTO "OrphanReference" ("id", "recordType", "recordId", "field", "targetType", "targetId")
SELECT 'Deal:' || child.id || ':parentDealId', 'Deal', child.id, 'parentDealId', 'Deal', child."parentDealId"
FROM "Deal" child LEFT JOIN "Deal" parent ON parent.id = child."parentDealId"
WHERE child."parentDealId" IS NOT NULL AND parent.id IS NULL;

INSERT INTO "OrphanReference" ("id", "recordType", "recordId", "field", "targetType", "targetId")
SELECT 'Task:' || task.id || ':linkedId', 'Task', task.id, 'linkedId', task."linkedType", task."linkedId"
FROM "Task" task
WHERE task."linkedId" IS NOT NULL AND task."linkedId" <> '' AND (
  (task."linkedType" = 'Deal' AND NOT EXISTS (SELECT 1 FROM "Deal" d WHERE d.id = task."linkedId")) OR
  (task."linkedType" = 'Lead' AND NOT EXISTS (SELECT 1 FROM "Lead" l WHERE l.id = task."linkedId")) OR
  (task."linkedType" = 'Contact' AND NOT EXISTS (SELECT 1 FROM "Contact" c WHERE c.id = task."linkedId")) OR
  (task."linkedType" = 'Company' AND NOT EXISTS (SELECT 1 FROM "Company" c WHERE c.id = task."linkedId"))
);

INSERT INTO "OrphanReference" ("id", "recordType", "recordId", "field", "targetType", "targetId")
SELECT 'Activity:' || activity.id || ':linkedId', 'Activity', activity.id, 'linkedId', activity."linkedType", activity."linkedId"
FROM "Activity" activity
WHERE activity."linkedId" IS NOT NULL AND activity."linkedId" <> '' AND (
  (activity."linkedType" = 'Deal' AND NOT EXISTS (SELECT 1 FROM "Deal" d WHERE d.id = activity."linkedId")) OR
  (activity."linkedType" = 'Lead' AND NOT EXISTS (SELECT 1 FROM "Lead" l WHERE l.id = activity."linkedId")) OR
  (activity."linkedType" = 'Contact' AND NOT EXISTS (SELECT 1 FROM "Contact" c WHERE c.id = activity."linkedId")) OR
  (activity."linkedType" = 'Company' AND NOT EXISTS (SELECT 1 FROM "Company" c WHERE c.id = activity."linkedId"))
);

UPDATE "Deal" child SET "parentDealId" = NULL
WHERE child."parentDealId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Deal" parent WHERE parent.id = child."parentDealId");

ALTER TABLE "Deal" ADD CONSTRAINT "Deal_parentDealId_fkey"
  FOREIGN KEY ("parentDealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_customer_link() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."linkedType" IS NOT DISTINCT FROM OLD."linkedType"
    AND NEW."linkedId" IS NOT DISTINCT FROM OLD."linkedId" THEN RETURN NEW; END IF;
  IF NEW."linkedId" IS NULL OR NEW."linkedId" = '' THEN RETURN NEW; END IF;
  IF (NEW."linkedType" = 'Deal' AND EXISTS (SELECT 1 FROM "Deal" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Lead' AND EXISTS (SELECT 1 FROM "Lead" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Contact' AND EXISTS (SELECT 1 FROM "Contact" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Company' AND EXISTS (SELECT 1 FROM "Company" WHERE id = NEW."linkedId"))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Linked customer record does not exist' USING ERRCODE = '23503';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Task_validate_customer_link" BEFORE INSERT OR UPDATE OF "linkedType", "linkedId" ON "Task"
  FOR EACH ROW EXECUTE FUNCTION validate_customer_link();
CREATE TRIGGER "Note_validate_customer_link" BEFORE INSERT OR UPDATE OF "linkedType", "linkedId" ON "Note"
  FOR EACH ROW EXECUTE FUNCTION validate_customer_link();
CREATE TRIGGER "Activity_validate_customer_link" BEFORE INSERT OR UPDATE OF "linkedType", "linkedId" ON "Activity"
  FOR EACH ROW EXECUTE FUNCTION validate_customer_link();
