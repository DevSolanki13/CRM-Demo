<p align="center">
  <a href="README.md">📖 Overview</a> &nbsp;|&nbsp;
  <a href="features.md">✨ Features</a> &nbsp;|&nbsp;
  <b>🔄 Flow</b> &nbsp;|&nbsp;
  <a href="architecture.md">🏗️ Architecture</a> &nbsp;|&nbsp;
  <a href="db.md">🗄️ Database</a> &nbsp;|&nbsp;
  <a href="api.md">🔌 API</a> &nbsp;|&nbsp;
  <a href="setup-guide.md">🚀 Setup Guide</a>
</p>

---

# Sales CRM — Complete System & Process Flows

This document details the end-to-end workflows, lifecycles, and operational flows governing the Sales CRM platform. Every flow is illustrated using step-by-step logic, actors involved, database mutations, and Mermaid sequence/state diagrams.

---

## 1. High-Level B2B Customer Journey

The complete B2B sales lifecycle moves continuously from initial lead capture through conversion, stage-gated progression, manager approval, terminal closing, and automated repeat purchase cycles:

```mermaid
flowchart TD
    A([Inbound Inquiry / Outbound Prospect]) --> B[Lead Created in Leads Ledger]
    B --> C{Lead Qualification Checks}
    C -- Unqualified --> D[Status: Unqualified]
    C -- Qualified --> E[Convert Lead to Deal + Account + Contact]
    
    E --> F[Deal in Pipeline: New Lead / Contacted]
    F --> G{Stage Gate Verification}
    
    G -- Criteria Met --> H[Sales Rep Submits Stage Advancement]
    G -- Criteria Failed --> I[Route to Closed Lost with Lost Reason]
    
    H --> J{User Role?}
    J -- Sales Rep --> K[Status: Pending Review<br>Task Created for Manager]
    J -- Admin --> L[Direct Override with Audit Reason]
    
    K --> M{Manager Review}
    M -- Reject --> N[Revert to Current Stage<br>Rep Feedback Logged]
    M -- Approve --> O[Advance to Target Stage]
    L --> O
    
    O --> P{Pipeline Progression}
    P -- Next Stages --> G
    P -- Deal Lost --> I
    P -- Deal Won --> Q[Closed Won State Preserved]
    
    Q --> R{isRecurring == true?}
    R -- Yes --> S[Automated Rebuy Child Deal Created<br>Buy Again Stage]
    R -- No --> T([Transaction Concluded])
    
    S --> U[Renewal Outreach Task Scheduled]
    U --> G
```

---

## 2. Lead Qualification & Conversion Flow

Leads represent early-stage inquiries and cold outbound contacts that must be qualified before becoming active pipeline opportunities.

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Rep / Inbound
    participant UI as LeadsView & Drawer
    participant API as Express API (/api/leads)
    participant DB as PostgreSQL (Prisma)
    participant Audit as AuditLog Service

    Rep->>UI: Enter Lead Details (Title, Contact Name, Email, Phone, Company, isOutbound)
    UI->>UI: Validate Title (Non-empty & non-numeric sanity check)
    UI->>API: POST /api/leads
    API->>DB: INSERT INTO Lead (status: 'New', isOutbound, ...)
    DB-->>API: Saved Lead Record
    API->>Audit: logAudit(LEAD_CREATED)
    API-->>UI: 201 Created (Lead Object)
    UI-->>Rep: Toast Notification & Lead added to table

    Note over Rep,UI: Rep initiates qualification outreach (Status: Working -> Qualified)

    Rep->>UI: Click [ Convert to Deal ]
    UI->>API: POST /api/companies (Upsert corporate account)
    API->>DB: Upsert Company
    UI->>API: POST /api/contacts (Link to Company)
    API->>DB: Upsert Contact
    UI->>API: POST /api/deals (leadId, companyId, contactId, stage: 'New Lead')
    API->>DB: INSERT INTO Deal
    API->>DB: UPDATE Lead SET status = 'Converted'
    API->>Audit: logAudit(DEAL_CREATED, from Lead conversion)
    API-->>UI: 200 OK (New Deal Object)
    UI-->>Rep: Success Toast & Redirect to Pipeline Kanban
```

### Conversion Logic & Invariants:
1. **Title Validation**: Rejects purely numeric inputs (e.g. `982341`) or single-character strings.
2. **Atomic Entity Creation**:
   - `Company`: Creates a new Account if it doesn't already exist.
   - `Contact`: Creates a new Contact attached to the Account.
   - `Deal`: Generates a sales opportunity with initial stage `stg-1` (`New Lead`) or `stg-2` (`Contacted`).
3. **Lead Status Immobility**: The Lead record is marked `Converted` and permanently linked to the Deal via `deal.leadId`. It cannot be re-converted.

---

## 3. Deal Stage-Gate Progression & Approval Flow

The core governance engine of the CRM prevents unauthorized or unqualified deals from jumping stages.

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Rep
    actor Mgr as Sales Manager / Admin
    participant UI as Kanban / DetailDrawer
    participant API as Express API (/api/deals)
    participant SGC as StageGate Service
    participant TSK as Task Service
    participant DB as PostgreSQL (Prisma)
    participant Audit as AuditLog Service

    Rep->>UI: Drag Deal to Next Stage OR Click [ Advance Stage ]
    UI->>UI: Check User Role
    
    rect rgb(240, 248, 255)
    Note over Rep,UI: Path A: Sales Rep (Role-Gated Review)
    UI->>UI: Open StageGateCheckModal
    Rep->>UI: Fill Binary Checklist & Enter Rep Observations
    UI->>API: POST /api/deals/:id/stage-transition<br>{ targetStageId, answers, notes, user }
    API->>SGC: createStageGateCheck(status: 'pending_review')
    SGC->>DB: INSERT INTO StageGateCheck
    SGC->>TSK: createTask(type: 'Approval', for Managers & Admins)
    TSK->>DB: INSERT INTO Task ([Stage Approval Required])
    API->>DB: UPDATE Deal SET status = 'Pending Review', pendingGateCheck = {...}
    API->>Audit: logAudit(APPROVAL_REQUESTED)
    API-->>UI: 200 OK (Deal in Pending Review)
    UI-->>Rep: Toast: "Advancement request submitted for Manager approval"
    end

    rect rgb(245, 255, 245)
    Note over Mgr,DB: Manager Review & Approval
    Mgr->>UI: Open Tasks Ledger (Team Agenda)
    UI->>Mgr: Display "[Stage Approval Required]" with criteria answers & notes
    Mgr->>UI: Click [ Approve & Move Stage ]
    UI->>API: POST /api/stage-gate-checks/:id/approve
    API->>DB: UPDATE StageGateCheck SET status = 'approved_and_executed'
    API->>DB: UPDATE Task SET status = 'done', resolution = 'Approved'
    API->>DB: UPDATE Deal SET stageId = targetStageId, stageName = targetStageName, status = 'Active', pendingGateCheck = null
    API->>Audit: logAudit(STAGE_APPROVED)
    API-->>UI: 200 OK
    UI-->>Mgr: Toast: "Deal promoted to target stage"
    end
```

### Alternative Path: Rejection Flow
If the Manager determines the criteria were not met or notes are insufficient:
1. Manager clicks **`[ Reject ]`** on the task or drawer.
2. `POST /api/stage-gate-checks/:id/reject` is invoked with feedback notes.
3. System updates:
   - `StageGateCheck.status = 'rejected'`.
   - `Task.status = 'done'`, `resolution = 'Rejected'`.
   - `Deal.status = 'Active'` (retaining the existing stage; `pendingGateCheck` cleared).
4. Permanent audit log `APPROVAL_REJECTED` is created with the manager's rejection reason.
5. Sales Rep receives an activity note and notification of the rejection.

### Alternative Path: Admin Direct Override
1. An **Admin** drags a deal card on the Kanban board or selects a target stage.
2. UI detects `user.role === 'Admin'` and displays the **Admin Override Confirmation Modal**.
3. Admin inputs a mandatory **Audit Override Reason** (e.g. *"CEO executive waiver for strategic partner"*).
4. `POST /api/deals/:id/stage-transition` is dispatched with `overrideReason`.
5. Backend advances the stage immediately without creating a pending approval task.
6. A permanent audit log `STAGE_OVERRIDE` is logged with the admin's explanation.

---

## 4. Backward Stage Demotion Flow

When an active opportunity encounters unexpected friction (e.g. technical spec changed, client champion left), moving the deal backward is strictly governed.

```mermaid
flowchart TD
    A[User Drags Deal Backward in Kanban] --> B{Is Target Stage Earlier in Order?}
    B -- Yes --> C[Trigger Demotion Modal]
    C --> D[Prompt User for Mandatory Demotion Reason]
    D --> E{Reason Entered?}
    E -- No --> F[Block Movement & Reset Kanban Position]
    E -- Yes --> G[Dispatch POST /api/deals/:id/stage-transition]
    G --> H[Update Deal stageId & daysInStage = 0]
    G --> I[Create Activity Entry: Deal Demoted]
    G --> J[Log Permanent Audit: STAGE_DEMOTED]
    J --> K[Display Sonner Warning Toast]
```

### Enforced Rules:
- **Demotion Reason Mandatory**: The API rejects any backward transition if `demotionReason` or `reason` is blank or whitespace.
- **Stage Aging Reset**: Moving backward resets `daysInStage` to `0` to track velocity in the reassigned stage accurately.
- **Audit Trace**: The audit ledger logs `fromStage`, `toStage`, actor ID, timestamp, and the demotion reason.

---

## 5. Terminal Stages: Closed Won vs. Closed Lost Flow

Pipeline stages terminate in one of two states: **Closed Won** (successful contract) or **Closed Lost** (deal dropped or disqualified).

```mermaid
stateDiagram-v2
    [*] --> ActivePipeline: Negotiation / Proposal Sent
    
    ActivePipeline --> ClosedLost: Fails Qualification / Competitor Selected
    note right of ClosedLost
        Mandatory Lost Reason Category:
        - Price / Budget
        - Competitor Won
        - Lack of Authority
        - No Current Need
        - Product Capability Gap
        Requires Rep Notes
    end note
    
    ActivePipeline --> ClosedWon: Contract Signed & PO Received
    note right of ClosedWon
        Permanent historical record
        Preserves original won revenue
        Triggers Rebuy Engine
    end note

    ClosedWon --> RebuyEvaluation: Check isRecurring
    RebuyEvaluation --> TerminalWon: isRecurring == false
    RebuyEvaluation --> BuyAgainStage: isRecurring == true
    note right of BuyAgainStage
        Creates child Deal: dl-rebuy-...
        Stages into 'Buy Again (Renewal)'
        Schedules Renewal Outreach Task
    end note
```

### Closed Lost Protocol:
1. **Trigger**: Invoked when an agent fails gate criteria or clicks `[ Mark as Lost ]`.
2. **Payload Enforcement**:
   - `lostReason`: Selected from standard categories (`Price / Budget`, `Competitor Won`, `Timing`, `Authority`, `Product Gap`).
   - `lostReasonNote`: Explanatory qualitative text.
3. **Database Mutations**:
   - `Deal.status = 'Lost'`.
   - `Deal.stageId = 'stg-8'`, `Deal.stageName = 'Closed Lost'`.
   - `Deal.actualCloseDate = today`.
   - `Deal.lostReason = lostReason`, `Deal.lostReasonNote = note`.
4. **Terminal Invariant**: A Closed Lost deal cannot transition forward. Reopening requires creating a new deal.

---

## 6. Automated Rebuy & Renewal Generation Engine

For recurring revenue models, winning a deal initiates the next sales cycle automatically.

```mermaid
sequenceDiagram
    autonumber
    participant App as CRM Client / Timer
    participant API as Express API (/api/deals/check-renewals)
    participant DealSvc as dealService.js
    participant DB as PostgreSQL (Prisma)
    participant TskSvc as taskService.js
    participant Audit as AuditLog Service

    Note over App,API: Daily Schedule or Manual Trigger
    App->>API: POST /api/deals/check-renewals
    API->>DealSvc: triggerRenewalCheck()
    DealSvc->>DB: Query deals WHERE isRecurring = true AND status = 'Won' (or stage = 'Closed Won')
    DB-->>DealSvc: List of Won Recurring Deals

    loop For each recurring deal
        DealSvc->>DB: Check if active child renewal deal exists
        alt Active child renewal already exists
            DealSvc->>DealSvc: Skip (prevent duplicate cycles)
        else No active renewal exists
            DealSvc->>DealSvc: Calculate elapsed days since closeDate
            alt diffDays >= recurrenceDays
                DealSvc->>DB: INSERT INTO Deal (id: 'dl-rebuy-...', parentDealId: deal.id, stage: 'Buy Again (Renewal)', status: 'Renewal Due')
                DealSvc->>TskSvc: createTask(title: "[Rebuy Outreach] Review renewal contract...", type: "Renewal Check-in")
                TskSvc->>DB: INSERT INTO Task
                DealSvc->>Audit: logAudit(REBUY_CREATED)
            end
        end
    end

    DealSvc-->>API: { checkedCount, createdCount }
    API-->>App: 200 OK (Summary Report)
```

### Rebuy Invariants:
1. **Non-Destructive**: The parent won deal remains untouched; its win date and contract value are preserved in financial reports.
2. **Lineage Tracking**: Child renewal opportunities contain `parentDealId` pointing back to the original contract.
3. **Duplicate Prevention**: If an active child opportunity is already in flight, the renewal engine skips re-creation.

---

## 7. Manager Task & Agenda Flow

The Tasks module acts as both a personal follow-up manager and an executive governance ledger.

```mermaid
flowchart LR
    subgraph Rep Follow-ups
        A[Scheduled Calls]
        B[Scheduled Meetings]
        C[Personal Reminders]
    end

    subgraph System Generated
        D["[Stage Approval Required] Tasks"]
        E["[Rebuy Outreach] Tasks"]
    end

    A --> F[Tasks & Agenda Ledger]
    B --> F
    C --> F
    D --> F
    E --> F

    F --> G{Filter by Scope}
    G -- "My Tasks" --> H[Current User Assigned Deliverables]
    G -- "Team Agenda" --> I[All Pending Organizational Tasks & Approvals]

    I --> J{Task Action}
    J -- Standard Task --> K[Mark Completed / Reschedule]
    J -- Approval Task --> L["[ Approve & Move Stage ] / [ Reject ]"]
```

---

## 8. Permanent Audit Logging Flow

To maintain SOC2, ISO, and enterprise compliance, every critical state mutation is logged immutably.

```mermaid
flowchart TD
    A[Mutating API Request] --> B{Action Type}
    
    B -- Lead Created/Converted --> C[Entity: Lead / Deal]
    B -- Stage Advancement --> D[Entity: Deal]
    B -- Stage Gate Review --> E[Entity: StageGateCheck / Deal]
    B -- Admin Direct Override --> F[Entity: Deal]
    B -- Deal Demotion --> G[Entity: Deal]
    B -- Rebuy Created --> H[Entity: Deal]
    
    C & D & E & F & G & H --> I[logAudit Utility]
    
    I --> J[Assemble Audit Payload]
    J --> K["actorId, actorName<br>action (e.g. STAGE_OVERRIDE)<br>entityType, entityId, entityTitle<br>fromStage, toStage<br>reason, metadata (JSON)"]
    
    K --> L[Prisma INSERT INTO AuditLog]
    L --> M[(PostgreSQL Database)]
```

### Audit Invariants:
- **No Deletion API**: Audit log entries have no corresponding DELETE endpoint; logs are append-only.
- **Actor Identification**: Captures the exact authenticated user ID and name responsible for the action.
- **Reason Preservation**: Any override or demotion stores the verbatim explanation entered by the user.

---

## 9. Contact Bulk Import & Deduplication Flow

When importing contacts from spreadsheets or external databases:

```mermaid
sequenceDiagram
    autonumber
    actor User as Sales Rep / Admin
    participant UI as ImportExportModal
    participant API as POST /api/import/contacts
    participant DB as PostgreSQL (Prisma)

    User->>UI: Select CSV File or Paste Raw CSV Text
    UI->>UI: Parse CSV headers (name, email, phone, company, title)
    UI->>API: POST /api/import/contacts { contacts: [...] }
    
    loop For each contact in payload
        API->>DB: Query Contact by email OR phone
        alt Match Found (Duplicate)
            API->>DB: UPDATE Contact (fill missing fields)
            API->>API: Increment updatedCount
        else No Match
            API->>DB: INSERT INTO Contact
            API->>API: Increment createdCount
        end
    end

    API-->>UI: 200 OK { success: true, createdCount, updatedCount }
    UI-->>User: Success Toast with detailed counts
```

---

## 10. Application Error & Recovery Flow

The CRM features multi-tiered error boundaries to guarantee that an unexpected crash in one component does not break the entire application.

```mermaid
flowchart TD
    A[Runtime Exception in React Component] --> B{Caught by ErrorBoundary?}
    B -- Yes --> C[Render ErrorBoundary Fallback Screen]
    C --> D[Display Component Stack & Error Diagnostics]
    C --> E[Provide Options: 'Reload Page' OR 'Reset Demo State']
    
    E -- Reset Demo State --> F[POST /api/state/reset]
    F --> G[Prisma re-seeds database from initialData.js]
    G --> H[Reload Application to Pristine State]

    B -- No (API Level Error) --> I[Global Express Error Middleware]
    I --> J[Catch err and format JSON response]
    J --> K[Return HTTP 4xx/5xx with { error, statusCode }]
    K --> L[Frontend Sonner catches and displays error toast]
```
