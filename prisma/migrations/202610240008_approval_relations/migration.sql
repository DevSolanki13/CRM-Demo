CREATE INDEX "Task_stageGateCheckId_idx" ON "Task"("stageGateCheckId");
CREATE INDEX "StageGateCheck_dealId_idx" ON "StageGateCheck"("dealId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_stageGateCheckId_fkey"
  FOREIGN KEY ("stageGateCheckId") REFERENCES "StageGateCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StageGateCheck" ADD CONSTRAINT "StageGateCheck_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_linked_customer_history() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Task" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Note" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM "Activity" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
  THEN RAISE EXCEPTION 'Customer history must be reassigned before deleting this record'
    USING ERRCODE = '23503'; END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Deal_protect_linked_history" BEFORE DELETE ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION protect_linked_customer_history('Deal');
CREATE TRIGGER "Lead_protect_linked_history" BEFORE DELETE ON "Lead"
  FOR EACH ROW EXECUTE FUNCTION protect_linked_customer_history('Lead');
CREATE TRIGGER "Contact_protect_linked_history" BEFORE DELETE ON "Contact"
  FOR EACH ROW EXECUTE FUNCTION protect_linked_customer_history('Contact');
CREATE TRIGGER "Company_protect_linked_history" BEFORE DELETE ON "Company"
  FOR EACH ROW EXECUTE FUNCTION protect_linked_customer_history('Company');
