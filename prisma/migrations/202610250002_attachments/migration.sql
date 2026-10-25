CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "recordType" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "purgedAt" TIMESTAMP(3),
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attachment_storagePath_key" ON "Attachment"("storagePath");
CREATE INDEX "Attachment_recordType_recordId_deletedAt_idx" ON "Attachment"("recordType", "recordId", "deletedAt");
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

CREATE FUNCTION validate_attachment_link() RETURNS trigger AS $$
BEGIN
  IF (NEW."recordType" = 'Deal' AND EXISTS (SELECT 1 FROM "Deal" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Lead' AND EXISTS (SELECT 1 FROM "Lead" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Contact' AND EXISTS (SELECT 1 FROM "Contact" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Company' AND EXISTS (SELECT 1 FROM "Company" WHERE id = NEW."recordId"))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Attachment customer record does not exist' USING ERRCODE = '23503';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Attachment_validate_customer_link" BEFORE INSERT OR UPDATE OF "recordType", "recordId" ON "Attachment"
  FOR EACH ROW EXECUTE FUNCTION validate_attachment_link();

CREATE OR REPLACE FUNCTION protect_linked_customer_history() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Task" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Note" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Activity" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Attachment" WHERE "recordType" = TG_ARGV[0]
      AND "recordId" = OLD.id AND "deletedAt" IS NULL)
  THEN RAISE EXCEPTION 'Customer history must be reassigned before deleting this record'
    USING ERRCODE = '23503'; END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
