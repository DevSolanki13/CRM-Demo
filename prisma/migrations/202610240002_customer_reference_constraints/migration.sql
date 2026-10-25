-- Stop on inconsistent data so each database can be backed up and reconciled.
-- The legacy parentDealId link is excluded until its orphan is resolved.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Contact" c WHERE c."companyId" = '' OR
    (c."companyId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Company" x WHERE x.id = c."companyId")))
    OR EXISTS (SELECT 1 FROM "Deal" d WHERE d."companyId" = '' OR
      (d."companyId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Company" x WHERE x.id = d."companyId")))
    OR EXISTS (SELECT 1 FROM "Deal" d WHERE d."contactId" = '' OR
      (d."contactId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Contact" x WHERE x.id = d."contactId")))
    OR EXISTS (SELECT 1 FROM "Deal" d WHERE NOT EXISTS (SELECT 1 FROM "Stage" x WHERE x.id = d."stageId"))
    OR EXISTS (SELECT 1 FROM "Deal" d WHERE d."leadId" = '' OR
      (d."leadId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Lead" x WHERE x.id = d."leadId")))
    OR EXISTS (SELECT 1 FROM "Company" c WHERE c."ownerId" = '' OR
      (c."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" x WHERE x.id = c."ownerId")))
    OR EXISTS (SELECT 1 FROM "Contact" c WHERE c."ownerId" = '' OR
      (c."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" x WHERE x.id = c."ownerId")))
    OR EXISTS (SELECT 1 FROM "Lead" l WHERE l."ownerId" = '' OR
      (l."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" x WHERE x.id = l."ownerId")))
    OR EXISTS (SELECT 1 FROM "Deal" d WHERE d."ownerId" = '' OR
      (d."ownerId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" x WHERE x.id = d."ownerId"))) THEN
    RAISE EXCEPTION 'Customer references need reconciliation before adding foreign keys';
  END IF;
END $$;

CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");
CREATE INDEX "Deal_ownerId_status_idx" ON "Deal"("ownerId", "status");
CREATE INDEX "Deal_stageId_idx" ON "Deal"("stageId");
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");
CREATE INDEX "Deal_contactId_idx" ON "Deal"("contactId");
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");
CREATE INDEX "Deal_parentDealId_idx" ON "Deal"("parentDealId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
