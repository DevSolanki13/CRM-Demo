ALTER TABLE "OrphanReference"
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedTargetId" TEXT;
