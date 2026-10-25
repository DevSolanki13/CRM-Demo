ALTER TABLE "Deal" ADD COLUMN "lostStageId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "lostStageName" TEXT;

-- Only an executed approval or a loss audit with an explicit source-stage ID
-- establishes where a historical deal was lost. Ambiguous evidence stays null.
WITH evidence AS (
  SELECT "dealId" AS deal_id, "fromStageId" AS stage_id, "fromStageName" AS stage_name
  FROM "StageGateCheck"
  WHERE status = 'approved_and_executed'
    AND ("targetStageId" = 'stg-8' OR outcome = 'lost')
    AND "fromStageId" IS NOT NULL
  UNION ALL
  SELECT "entityId", metadata->>'fromStageId', "fromStage"
  FROM "AuditLog"
  WHERE "entityType" = 'Deal'
    AND action IN ('DEAL_LOST', 'CLOSED_LOST', 'APPROVAL_APPROVED', 'ADMIN_OVERRIDE')
    AND metadata->>'toStageId' = 'stg-8'
    AND metadata->>'fromStageId' IS NOT NULL
), certain AS (
  SELECT deal_id, MIN(stage_id) AS stage_id, MIN(stage_name) AS stage_name
  FROM evidence
  GROUP BY deal_id
  HAVING COUNT(DISTINCT stage_id) = 1
)
UPDATE "Deal" AS deal
SET "lostStageId" = certain.stage_id,
    "lostStageName" = COALESCE(stage.name, certain.stage_name)
FROM certain
LEFT JOIN "Stage" AS stage ON stage.id = certain.stage_id
WHERE deal.id = certain.deal_id
  AND deal.status = 'Lost'
  AND deal."lostStageId" IS NULL;
