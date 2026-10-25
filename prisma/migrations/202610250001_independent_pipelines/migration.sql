CREATE TABLE "Pipeline" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "qualificationRules" JSONB,
  CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Pipeline_name_key" ON "Pipeline"("name");
INSERT INTO "Pipeline" ("id", "name", "active", "qualificationRules")
VALUES ('pipeline-sales', 'Sales', true, '{}'::jsonb);

ALTER TABLE "Stage" ADD COLUMN "pipelineId" TEXT NOT NULL DEFAULT 'pipeline-sales';
ALTER TABLE "Stage" ADD COLUMN "code" TEXT;
UPDATE "Stage" SET "code" = CASE "id"
  WHEN 'stg-1' THEN 'NEW_LEAD'
  WHEN 'stg-2' THEN 'CONTACTED'
  WHEN 'stg-3' THEN 'SAMPLE_SENT'
  WHEN 'stg-4' THEN 'PROPOSAL_SENT'
  WHEN 'stg-5' THEN 'NEGOTIATION'
  WHEN 'stg-6' THEN 'CLOSED_WON'
  WHEN 'stg-7' THEN 'RENEWAL'
  WHEN 'stg-8' THEN 'CLOSED_LOST'
  ELSE 'CUSTOM_' || "id" END;
ALTER TABLE "Stage" ALTER COLUMN "code" SET NOT NULL;
DROP INDEX "Stage_name_key";
CREATE UNIQUE INDEX "Stage_pipelineId_name_key" ON "Stage"("pipelineId", "name");
CREATE UNIQUE INDEX "Stage_pipelineId_code_key" ON "Stage"("pipelineId", "code");
CREATE INDEX "Stage_pipelineId_order_idx" ON "Stage"("pipelineId", "order");
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_pipelineId_fkey"
  FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Deal" ADD COLUMN "pipelineId" TEXT NOT NULL DEFAULT 'pipeline-sales';
CREATE INDEX "Deal_pipelineId_stageId_idx" ON "Deal"("pipelineId", "stageId");
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey"
  FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_deal_stage_pipeline() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Stage" WHERE id = NEW."stageId" AND "pipelineId" = NEW."pipelineId") THEN
    RAISE EXCEPTION 'Deal stage belongs to another pipeline' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Deal_stage_pipeline_match" BEFORE INSERT OR UPDATE OF "pipelineId", "stageId" ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION enforce_deal_stage_pipeline();
