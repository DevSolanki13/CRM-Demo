CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "accountEmail" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'connected',
  "grantedScopes" TEXT[] NOT NULL, "encryptedTokens" TEXT, "cursor" JSONB,
  "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSyncAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3), "leaseToken" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IntegrationConnection_provider_check" CHECK ("provider" = 'google'),
  CONSTRAINT "IntegrationConnection_status_check" CHECK ("status" IN ('connected', 'error', 'needs_reauth', 'disconnected'))
);
CREATE INDEX "IntegrationConnection_userId_provider_idx" ON "IntegrationConnection"("userId", "provider");
CREATE UNIQUE INDEX "IntegrationConnection_userId_provider_accountEmail_key" ON "IntegrationConnection"("userId", "provider", "accountEmail");
CREATE UNIQUE INDEX "IntegrationConnection_active_user_provider" ON "IntegrationConnection"("userId", "provider") WHERE "status" <> 'disconnected';
CREATE INDEX "IntegrationConnection_status_nextSyncAt_lockedUntil_idx" ON "IntegrationConnection"("status", "nextSyncAt", "lockedUntil");
CREATE TABLE "IntegrationOAuthState" (
  "stateHash" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL, "encryptedVerifier" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IntegrationOAuthState_expiresAt_idx" ON "IntegrationOAuthState"("expiresAt");
ALTER TABLE "Activity" ADD COLUMN "integrationConnectionId" TEXT, ADD COLUMN "externalId" TEXT;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Activity_integrationConnectionId_externalId_key" ON "Activity"("integrationConnectionId", "externalId");
CREATE INDEX "Activity_linkedType_linkedId_id_idx" ON "Activity"("linkedType", "linkedId", "id");
CREATE INDEX "Activity_timestamp_id_idx" ON "Activity"("timestamp", "id");
ALTER TABLE "Attachment" ADD COLUMN "uploadStatus" TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN "cleanupAttempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lastCleanupError" TEXT;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadStatus_check" CHECK ("uploadStatus" IN ('pending', 'ready'));
CREATE INDEX "Lead_ownerId_id_idx" ON "Lead"("ownerId", "id");
CREATE INDEX "Deal_pipelineId_id_idx" ON "Deal"("pipelineId", "id");
CREATE INDEX "Task_ownerId_id_idx" ON "Task"("ownerId", "id");
CREATE INDEX "Task_linkedType_linkedId_id_idx" ON "Task"("linkedType", "linkedId", "id");
ALTER TABLE "IntegrationConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationOAuthState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "IntegrationConnection", "IntegrationOAuthState" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "IntegrationConnection", "IntegrationOAuthState" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "IntegrationConnection", "IntegrationOAuthState" FROM authenticated;
  END IF;
END $$;
