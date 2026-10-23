-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "appName" TEXT NOT NULL DEFAULT 'Sales CRM',
    "tagline" TEXT NOT NULL DEFAULT 'Customizable B2B Sales & Recurring Order Platform',
    "logoIcon" TEXT NOT NULL DEFAULT 'Building2',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "accentColor" TEXT NOT NULL DEFAULT '#10b981',
    "defaultRecurrenceDays" INTEGER NOT NULL DEFAULT 60,
    "customFields" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Sales Rep',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FFFFFF',

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "customFields" JSONB,
    "createdAt" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "source" TEXT,
    "isOutbound" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'New',
    "ownerId" TEXT,
    "ownerName" TEXT,
    "createdAt" TEXT,
    "lastActivityDate" TEXT,
    "pendingGateCheck" JSONB,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "parentDealId" TEXT,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stageId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "expectedCloseDate" TEXT,
    "actualCloseDate" TEXT,
    "contactId" TEXT,
    "contactName" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isRebuy" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceDays" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TEXT,
    "updatedAt" TEXT,
    "lastActivityDate" TEXT,
    "daysInStage" INTEGER NOT NULL DEFAULT 0,
    "valueHistory" JSONB,
    "reason" TEXT,
    "lostReason" TEXT,
    "lostReasonNote" TEXT,
    "proposalExpiryDate" TEXT,
    "pendingGateCheck" JSONB,
    "partialGateState" JSONB,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Call',
    "linkedType" TEXT,
    "linkedId" TEXT,
    "linkedTitle" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stageGateCheckId" TEXT,
    "answers" JSONB,
    "repObservations" TEXT,
    "submittedBy" TEXT,
    "submittedByName" TEXT,
    "submittedAt" TEXT,
    "reviewedByName" TEXT,
    "resolution" TEXT,
    "note" TEXT,
    "fromStageName" TEXT,
    "targetStageName" TEXT,
    "createdAt" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "linkedType" TEXT,
    "linkedId" TEXT,
    "createdAt" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TEXT,
    "linkedType" TEXT,
    "linkedId" TEXT,
    "linkedTitle" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "performedByName" TEXT,
    "assignedToName" TEXT,
    "stageId" TEXT,
    "stageName" TEXT,
    "isOutbound" BOOLEAN DEFAULT false,
    "metadata" JSONB,
    "createdAt" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageGateCheck" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealTitle" TEXT,
    "fromStageId" TEXT,
    "fromStageName" TEXT,
    "targetStageId" TEXT,
    "targetStageName" TEXT,
    "submittedBy" TEXT,
    "submittedByName" TEXT,
    "reviewedBy" TEXT,
    "reviewedByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "answers" JSONB,
    "outcome" TEXT,
    "lostReason" TEXT,
    "note" TEXT,
    "timestamp" TEXT,
    "createdAt" TEXT,

    CONSTRAINT "StageGateCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT,
    "fromStage" TEXT,
    "toStage" TEXT,
    "reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_name_key" ON "Stage"("name");

