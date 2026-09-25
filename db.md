<p align="center">
  <a href="README.md">📖 Overview</a> &nbsp;|&nbsp;
  <a href="features.md">✨ Features</a> &nbsp;|&nbsp;
  <a href="flow.md">🔄 Flow</a> &nbsp;|&nbsp;
  <a href="architecture.md">🏗️ Architecture</a> &nbsp;|&nbsp;
  <b>🗄️ Database</b> &nbsp;|&nbsp;
  <a href="api.md">🔌 API</a> &nbsp;|&nbsp;
  <a href="setup-guide.md">🚀 Setup Guide</a>
</p>

---

# Sales CRM — Database Architecture & Schema Specification

This document provides a comprehensive reference for the Sales CRM database, covering its PostgreSQL architecture, Prisma ORM 7 integration, connection pooling, Entity-Relationship (ER) model, detailed model definitions, JSON schemas, and database management workflows.

---

## 1. Database Architecture & Infrastructure

| Attribute | Specification |
|:---|:---|
| **Database Engine** | PostgreSQL 15+ (Cloud instances on Supabase, Neon, or self-hosted) |
| **ORM Framework** | Prisma ORM 7 (`@prisma/client` ^7.10.0) |
| **Driver Adapter** | `@prisma/adapter-pg` (^7.10.0) with native `pg` client (^8.23.0) |
| **Connection Pooling** | Transaction & session pooling via PgBouncer / Supabase Pooler (`port 6543`) |
| **Direct Migration Port** | Direct TCP connection (`port 5432`) for schema synchronization and seeding |
| **Total Models** | 12 Prisma models |

### Dual-URL Connection Strategy:
```env
# Connection pool URL for runtime application queries (PgBouncer transaction mode)
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct TCP connection URL for Prisma CLI operations (db push, migrations, seeding)
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

---

## 2. Entity-Relationship Diagram (ERD)

The following Mermaid diagram maps the 12 core CRM entities and their logical references:

```mermaid
erDiagram
    BRANDING {
        string id PK
        string appName
        string tagline
        string logoIcon
        string primaryColor
        string accentColor
        int defaultRecurrenceDays
        json customFields
        datetime updatedAt
    }

    USER {
        string id PK
        string name
        string email UK
        string role
        boolean active
        string avatarUrl
    }

    STAGE {
        string id PK
        string name UK
        int order
        string category
        string color
    }

    COMPANY {
        string id PK
        string name
        string industry
        string website
        string address
        string notes
        string createdAt
    }

    CONTACT {
        string id PK
        string name
        string email
        string phone
        string jobTitle
        string companyId FK
        string companyName
        string ownerId FK
        string ownerName
        json customFields
        string createdAt
    }

    LEAD {
        string id PK
        string title
        string contactName
        string contactEmail
        string contactPhone
        string companyName
        string source
        boolean isOutbound
        string status
        string ownerId FK
        string ownerName
        string createdAt
        string lastActivityDate
        json pendingGateCheck
    }

    DEAL {
        string id PK
        string parentDealId FK
        string leadId FK
        string title
        float value
        string currency
        string stageId FK
        string stageName
        string expectedCloseDate
        string actualCloseDate
        string contactId FK
        string contactName
        string companyId FK
        string companyName
        string ownerId FK
        string ownerName
        boolean isRecurring
        boolean isRebuy
        int recurrenceDays
        string status
        string createdAt
        string updatedAt
        string lastActivityDate
        int daysInStage
        json valueHistory
        string reason
        string lostReason
        string lostReasonNote
        string proposalExpiryDate
        json pendingGateCheck
        json partialGateState
    }

    TASK {
        string id PK
        string title
        string dueDate
        string type
        string linkedType
        string linkedId FK
        string linkedTitle
        string ownerId FK
        string ownerName
        string status
        string stageGateCheckId FK
        json answers
        string repObservations
        string submittedBy
        string submittedByName
        string submittedAt
        string reviewedByName
        string resolution
        string note
        string fromStageName
        string targetStageName
        string createdAt
    }

    NOTE {
        string id PK
        string text
        string timestamp
        string authorId FK
        string authorName
        string linkedType
        string linkedId FK
        string createdAt
    }

    ACTIVITY {
        string id PK
        string type
        string description
        string timestamp
        string linkedType
        string linkedId FK
        string linkedTitle
        string authorId FK
        string authorName
        boolean isOutbound
        string createdAt
    }

    STAGE_GATE_CHECK {
        string id PK
        string dealId FK
        string dealTitle
        string fromStageId FK
        string fromStageName
        string targetStageId FK
        string targetStageName
        string submittedBy FK
        string submittedByName
        string reviewedBy FK
        string reviewedByName
        string status
        json answers
        string outcome
        string lostReason
        string note
        string timestamp
        string createdAt
    }

    AUDIT_LOG {
        string id PK
        string timestamp
        string actorId FK
        string actorName
        string action
        string entityType
        string entityId
        string entityTitle
        string fromStage
        string toStage
        string reason
        json metadata
    }

    COMPANY ||--o{ CONTACT : "employs"
    COMPANY ||--o{ DEAL : "contracts with"
    CONTACT ||--o{ DEAL : "primary buyer"
    LEAD ||--o| DEAL : "converts into"
    DEAL ||--o{ DEAL : "spawns rebuy"
    USER ||--o{ DEAL : "owns"
    USER ||--o{ LEAD : "owns"
    USER ||--o{ TASK : "assigned to"
    DEAL ||--o{ STAGE_GATE_CHECK : "qualifies through"
    STAGE_GATE_CHECK ||--o{ TASK : "generates approval task"
    DEAL ||--o{ NOTE : "annotated by"
    DEAL ||--o{ ACTIVITY : "interaction logged on"
```

---

## 3. Comprehensive Model Specifications

### 3.1 Model: `Branding`
Stores white-label branding, visual styling tokens, and default system settings.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id`, Default: `"default"` | Unique configuration identifier |
| `appName` | `String` | Default: `"Sales CRM"` | Application title displayed in UI and browser tabs |
| `tagline` | `String` | Default: `"Customizable B2B..."` | System subtitle / description |
| `logoIcon` | `String` | Default: `"Building2"` | Lucide icon identifier for header and logo |
| `primaryColor` | `String` | Default: `"#2563eb"` | Primary brand theme color (hex format) |
| `accentColor` | `String` | Default: `"#10b981"` | Accent highlight color (hex format) |
| `defaultRecurrenceDays` | `Int` | Default: `60` | Default repeat order renewal cycle in days |
| `customFields` | `Json?` | Nullable | Dynamic system-wide custom field configuration |
| `updatedAt` | `DateTime` | `@updatedAt` | Timestamp of last settings update |

---

### 3.2 Model: `User`
Stores staff members, administrators, and sales representatives with role designations.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique user identifier (e.g., `u-1`, `u-2`) |
| `name` | `String` | Required | Full staff name (e.g., `"Alex Vance"`) |
| `email` | `String` | `@unique` | Corporate email address |
| `role` | `String` | Default: `"Sales Rep"` | Role: `"Admin"`, `"Manager"`, or `"Sales Rep"` |
| `active` | `Boolean` | Default: `true` | Active status indicator |
| `avatarUrl` | `String?` | Nullable | Profile avatar image URL |

---

### 3.3 Model: `Stage`
Defines sales pipeline progression stages, order, categories, and visual colors.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique stage identifier (e.g., `stg-1`, `stg-2`) |
| `name` | `String` | `@unique` | Stage label (e.g., `"Proposal Sent"`, `"Closed Won"`) |
| `order` | `Int` | Required | Numerical sequence ordering (1 to 8) |
| `category` | `String` | Required | Stage classification: `"New"`, `"Evaluation"`, `"Won"`, `"Lost"` |
| `color` | `String` | Default: `"#FFFFFF"` | Hex color code used for badges and Kanban headers |

---

### 3.4 Model: `Company`
Represents client corporate accounts and business entities.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique company identifier (e.g., `comp-1`) |
| `name` | `String` | Required | Company legal or trade name |
| `industry` | `String?` | Nullable | Industry classification (e.g., `"Packaging"`, `"Logistics"`) |
| `website` | `String?` | Nullable | Corporate URL |
| `address` | `String?` | Nullable | Physical corporate address |
| `notes` | `String?` | Nullable | Account notes and strategic context |
| `createdAt` | `String?` | Nullable | Creation timestamp (YYYY-MM-DD) |

---

### 3.5 Model: `Contact`
Represents individual buyer personas, executives, and point-of-contacts at client accounts.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique contact identifier (e.g., `cnt-1`) |
| `name` | `String` | Required | Full contact name |
| `email` | `String?` | Nullable | Direct business email address |
| `phone` | `String?` | Nullable | Direct phone number |
| `jobTitle` | `String?` | Nullable | Professional designation (e.g., `"VP Procurement"`) |
| `companyId` | `String?` | Nullable | Logical foreign key referencing `Company.id` |
| `companyName` | `String?` | Nullable | Denormalized company name for fast display |
| `ownerId` | `String?` | Nullable | Logical foreign key referencing `User.id` |
| `ownerName` | `String?` | Nullable | Denormalized account owner name |
| `customFields` | `Json?` | Nullable | Custom metadata (e.g., LinkedIn URL, birthday) |
| `createdAt` | `String?` | Nullable | Creation timestamp (YYYY-MM-DD) |

---

### 3.6 Model: `Lead`
Represents early-stage prospects and marketing inquiries prior to qualification.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique lead identifier (e.g., `ld-1`) |
| `title` | `String` | Required | Lead title / project inquiry summary |
| `contactName` | `String?` | Nullable | Prospect individual name |
| `contactEmail` | `String?` | Nullable | Prospect email |
| `contactPhone` | `String?` | Nullable | Prospect phone |
| `companyName` | `String?` | Nullable | Prospective organization name |
| `source` | `String?` | Nullable | Lead source (e.g., `"Web Inbound"`, `"Referral"`) |
| `isOutbound` | `Boolean` | Default: `false` | Distinguishes cold outbound prospecting from inbound |
| `status` | `String` | Default: `"New"` | Status: `"New"`, `"Working"`, `"Qualified"`, `"Converted"` |
| `ownerId` | `String?` | Nullable | Assigned Sales Rep ID |
| `ownerName` | `String?` | Nullable | Assigned Sales Rep name |
| `createdAt` | `String?` | Nullable | Creation timestamp (YYYY-MM-DD) |
| `lastActivityDate` | `String?` | Nullable | Timestamp of most recent outreach or edit |
| `pendingGateCheck` | `Json?` | Nullable | Temporary holding state for pending qualification review |

---

### 3.7 Model: `Deal`
The central sales opportunity model representing pipeline contracts, values, and repeat purchases.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique deal identifier (e.g., `dl-1`, `dl-rebuy-...`) |
| `parentDealId` | `String?` | Nullable | References parent Deal ID for recurring rebuy lineage |
| `leadId` | `String?` | Nullable | References original Lead ID if converted from a lead |
| `title` | `String` | Required | Deal name / commercial project description |
| `value` | `Float` | Default: `0` | Estimated or contracted financial value |
| `currency` | `String` | Default: `"INR"` | Currency ISO code (INR, USD, EUR, etc.) |
| `stageId` | `String` | Required | References `Stage.id` |
| `stageName` | `String` | Required | Denormalized stage name for direct indexing |
| `expectedCloseDate` | `String?` | Nullable | Target closing date (YYYY-MM-DD) |
| `actualCloseDate` | `String?` | Nullable | Verified close won or close lost date |
| `contactId` | `String?` | Nullable | Primary contact ID |
| `contactName` | `String?` | Nullable | Primary contact name |
| `companyId` | `String?` | Nullable | Associated corporate account ID |
| `companyName` | `String?` | Nullable | Associated corporate account name |
| `ownerId` | `String?` | Nullable | Assigned Sales Rep ID |
| `ownerName` | `String?` | Nullable | Assigned Sales Rep name |
| `isRecurring` | `Boolean` | Default: `false` | Identifies accounts eligible for recurring repeat orders |
| `isRebuy` | `Boolean` | Default: `false` | True if this deal was generated automatically from a prior won deal |
| `recurrenceDays` | `Int` | Default: `60` | Number of days until next repeat order |
| `status` | `String` | Default: `"Active"` | Operational status: `"Active"`, `"Won"`, `"Lost"`, `"Renewal Due"`, `"Pending Review"` |
| `createdAt` | `String?` | Nullable | Deal creation timestamp (YYYY-MM-DD) |
| `updatedAt` | `String?` | Nullable | Last modification timestamp (YYYY-MM-DD) |
| `lastActivityDate` | `String?` | Nullable | Timestamp of last call, note, or stage movement |
| `daysInStage` | `Int` | Default: `0` | Number of days the deal has spent in current stage |
| `valueHistory` | `Json?` | Nullable | JSON array recording value revisions over time |
| `reason` | `String?` | Nullable | Context for stage promotion or demotion |
| `lostReason` | `String?` | Nullable | Category why deal was lost (`Price`, `Competitor`, etc.) |
| `lostReasonNote` | `String?` | Nullable | Qualitative explanation for lost deal |
| `proposalExpiryDate` | `String?` | Nullable | Expiration date of submitted proposal |
| `pendingGateCheck` | `Json?` | Nullable | Snapshot of checklist answers submitted for review |
| `partialGateState` | `Json?` | Nullable | In-progress answers saved prior to final submission |

---

### 3.8 Model: `Task`
Manages follow-up actions (Calls, Meetings) and Manager Approval agenda items.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique task identifier |
| `title` | `String` | Required | Task headline (e.g., `"[Stage Approval Required]..."`) |
| `dueDate` | `String?` | Nullable | Deadline for task completion (YYYY-MM-DD) |
| `type` | `String` | Default: `"Call"` | Type: `"Call"`, `"Meeting"`, `"Approval"`, `"Renewal Check-in"` |
| `linkedType` | `String?` | Nullable | Associated entity: `"Deal"`, `"Lead"`, `"Company"`, `"Contact"` |
| `linkedId` | `String?` | Nullable | Associated entity ID |
| `linkedTitle` | `String?` | Nullable | Associated entity title for display |
| `ownerId` | `String?` | Nullable | Assigned user ID |
| `ownerName` | `String?` | Nullable | Assigned user name |
| `status` | `String` | Default: `"pending"` | Status: `"pending"` or `"done"` |
| `stageGateCheckId` | `String?` | Nullable | References `StageGateCheck.id` if this is an approval task |
| `answers` | `Json?` | Nullable | Criteria answers submitted by rep for manager inspection |
| `repObservations` | `String?` | Nullable | Field notes submitted by rep |
| `submittedBy` | `String?` | Nullable | User ID of submitter |
| `submittedByName` | `String?` | Nullable | Name of submitter |
| `submittedAt` | `String?` | Nullable | ISO timestamp of submission |
| `reviewedByName` | `String?` | Nullable | Name of manager who resolved the review |
| `resolution` | `String?` | Nullable | Outcome: `"Approved"` or `"Rejected"` |
| `note` | `String?` | Nullable | Additional manager comments |
| `fromStageName` | `String?` | Nullable | Origin stage of proposed transition |
| `targetStageName` | `String?` | Nullable | Destination stage of proposed transition |
| `createdAt` | `String?` | Nullable | Task creation timestamp |

---

### 3.9 Model: `Note`
Stores internal qualitative commentary linked to Deals, Leads, Companies, or Contacts.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique note identifier |
| `text` | `String` | Required | Note body content |
| `timestamp` | `String?` | Nullable | Human-readable creation date/time |
| `authorId` | `String?` | Nullable | Creator user ID |
| `authorName` | `String?` | Nullable | Creator user name |
| `linkedType` | `String?` | Nullable | Linked entity type (`"Deal"`, `"Lead"`, etc.) |
| `linkedId` | `String?` | Nullable | Linked entity ID |
| `createdAt` | `String?` | Nullable | Creation timestamp (YYYY-MM-DD) |

---

### 3.10 Model: `Activity`
Chronological timeline feed recording interactions (Calls, Meetings, Stage Events).

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique activity identifier |
| `type` | `String` | Required | Interaction type (`"Call"`, `"Meeting"`, `"Stage Change"`, `"Note"`) |
| `description` | `String` | Required | Narrative description of interaction |
| `timestamp` | `String?` | Nullable | Display timestamp |
| `linkedType` | `String?` | Nullable | Linked entity type (`"Deal"`, `"Lead"`) |
| `linkedId` | `String?` | Nullable | Linked entity ID |
| `linkedTitle` | `String?` | Nullable | Linked entity title |
| `authorId` | `String?` | Nullable | Staff author user ID |
| `authorName` | `String?` | Nullable | Staff author user name |
| `isOutbound` | `Boolean?` | Default: `false` | True for outbound calls/outreach |
| `createdAt` | `String?` | Nullable | Creation timestamp (YYYY-MM-DD) |

---

### 3.11 Model: `StageGateCheck`
Maintains records of formal stage advancement requests, checklists, and review outcomes.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique check identifier (e.g., `sgc-1`) |
| `dealId` | `String` | Required | Associated Deal ID |
| `dealTitle` | `String?` | Nullable | Associated Deal title |
| `fromStageId` | `String?` | Nullable | Starting stage ID |
| `fromStageName` | `String?` | Nullable | Starting stage name |
| `targetStageId` | `String?` | Nullable | Proposed destination stage ID |
| `targetStageName` | `String?` | Nullable | Proposed destination stage name |
| `submittedBy` | `String?` | Nullable | Submitter user ID |
| `submittedByName` | `String?` | Nullable | Submitter user name |
| `reviewedBy` | `String?` | Nullable | Reviewer user ID (Manager/Admin) |
| `reviewedByName` | `String?` | Nullable | Reviewer user name |
| `status` | `String` | Default: `"pending"` | Status: `"pending"`, `"approved_and_executed"`, `"rejected"` |
| `answers` | `Json?` | Nullable | Dictionary of Yes/No criteria responses |
| `outcome` | `String?` | Nullable | Result: `"advanced"`, `"rejected"`, `"lost"` |
| `lostReason` | `String?` | Nullable | Reason if check resulted in Closed Lost |
| `note` | `String?` | Nullable | Observation notes |
| `timestamp` | `String?` | Nullable | ISO timestamp of check |
| `createdAt` | `String?` | Nullable | Creation timestamp |

---

### 3.12 Model: `AuditLog`
Immutable governance ledger recording all critical mutations, overrides, and demotions.

| Field | Type | Attributes | Description |
|:---|:---|:---|:---|
| `id` | `String` | `@id` | Unique audit log identifier |
| `timestamp` | `String` | Required | ISO 8601 timestamp of event |
| `actorId` | `String` | Required | Authenticated user ID responsible |
| `actorName` | `String` | Required | Authenticated user name responsible |
| `action` | `String` | Required | Action code (`STAGE_OVERRIDE`, `STAGE_APPROVED`, etc.) |
| `entityType` | `String` | Required | Modified entity type (`Deal`, `Lead`, `Company`) |
| `entityId` | `String` | Required | Target entity ID |
| `entityTitle` | `String?` | Nullable | Target entity title for readability |
| `fromStage` | `String?` | Nullable | Origin stage (if applicable) |
| `toStage` | `String?` | Nullable | Destination stage (if applicable) |
| `reason` | `String?` | Nullable | User-entered explanation / override reason |
| `metadata` | `Json?` | Nullable | Snapshot of payload diff or contextual attributes |

---

## 4. JSON Payload Structures & Schemas

### 4.1 `Deal.valueHistory`
Records financial renegotiations or adjustments throughout deal lifetime:
```json
[
  {
    "date": "2026-09-01",
    "oldValue": 100000,
    "value": 125000,
    "stage": "Negotiation",
    "reason": "Client expanded order volume to 5,000 units"
  }
]
```

### 4.2 `StageGateCheck.answers` & `Task.answers`
Stores objective qualification criteria verification:
```json
{
  "decisionMakerConfirmed": true,
  "budgetAllocated": true,
  "technicalSpecsValidated": true,
  "commercialTermsAligned": false
}
```

### 4.3 `AuditLog.metadata`
Stores structured event context for audit reporting:
```json
{
  "parentDealId": "dl-4",
  "contractValue": 85000,
  "recurrenceDays": 60,
  "overrideType": "Executive Admin Waiver"
}
```

---

## 5. Database Operations & Management

### 5.1 Push Schema to PostgreSQL (Without Migration Files)
To synchronize `prisma/schema.prisma` directly with Supabase or Neon:
```bash
npx prisma db push
```

### 5.2 Seeding Database with Demo Records
Executes `prisma/seed.js` using `backend/data/initialData.js`:
```bash
npm run seed
```

### 5.3 Interactive Visual Management (Prisma Studio)
Spawns a local visual browser on `http://localhost:5555`:
```bash
npx prisma studio
```
