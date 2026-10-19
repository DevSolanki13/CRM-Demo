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

# Sales CRM — System & Lifecycle Flows

This document details the lifecycle state machines, workflow sequences, and governance flows in Sales CRM.

---

## 1. High-Level B2B Customer Journey

```mermaid
flowchart TD
    A([Inbound Inquiry / Outbound Lead]) --> B[Lead Created in Leads Ledger]
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

## 2. Lead Qualification & Atomic Conversion Flow

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Rep / Inbound
    participant UI as LeadsView & Drawer
    participant API as Express API (/api/leads)
    participant DB as PostgreSQL (Prisma)
    participant Audit as AuditLog Service

    Rep->>UI: Enter Lead Details (Title, Contact, Company, isOutbound)
    UI->>UI: Validate Title (Non-empty & non-numeric sanity check)
    UI->>API: POST /api/leads
    API->>DB: INSERT INTO Lead (status: 'New', isOutbound, ...)
    DB-->>API: Saved Lead Record
    API->>Audit: logAudit(LEAD_CREATED)
    API-->>UI: 201 Created (Lead Object)
    UI-->>Rep: Toast Notification & Table Update

    Note over Rep,UI: Rep completes qualification outreach (Working -> Qualified)

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
    UI-->>Rep: Success Toast & Redirect to Pipeline
```

---

## 3. Deal Stage-Gate Progression & Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Rep
    actor Mgr as Sales Manager / Admin
    participant UI as Kanban / LeadJourneyView
    participant API as Express API (/api/deals)
    participant SGC as StageGate Service
    participant TSK as Task Service
    participant DB as PostgreSQL (Prisma)
    participant Audit as AuditLog Service

    Rep->>UI: Advance Stage
    UI->>UI: Check User Role
    
    rect rgb(240, 248, 255)
    Note over Rep,UI: Path A: Sales Rep (Role-Gated Review)
    UI->>UI: Open StageGateCheckModal
    Rep->>UI: Complete Binary Checklist & Enter Rep Notes
    UI->>API: POST /api/deals/:id/stage-transition<br>{ targetStageId, answers, notes, user }
    API->>SGC: createStageGateCheck(status: 'pending')
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
    UI->>Mgr: Display "[Stage Approval Required]" with criteria & notes
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

---

## 4. Lead Journey Historical Stage Inspection Flow

```mermaid
flowchart TD
    A[User Opens Lead Journey View] --> B[Renders Interlocking Chevron Milestones]
    B --> C{User Clicks Chevron Milestone}
    
    C -- Clicks Previous Stage --> D[Activate Historical Inspection Mode]
    D --> E[Render Blue Historical Banner: 'Viewing snapshot of [Stage] - Read Only']
    E --> F[Filter Activity Feed & Gate Checks to clicked stage]
    E --> G[Lock Stage Advancement Action Controls]
    E --> H[Provide Button: 'Return to Active Stage']
    H --> I[Restore Live Deal Progression Mode]
    
    C -- Clicks Current Stage --> I
    C -- Clicks Next Stage --> J[Trigger Stage Gate Check Modal]
```

---

## 5. Backward Stage Demotion Flow

```mermaid
flowchart TD
    A[User Moves Deal Backward] --> B{Is Target Stage Earlier?}
    B -- Yes --> C[Open Demotion Modal]
    C --> D[Require Mandatory Demotion Reason]
    D --> E{Reason Entered?}
    E -- No --> F[Block Movement & Abort]
    E -- Yes --> G[Dispatch POST /api/deals/:id/stage-transition]
    G --> H[Update Deal stageId & Reset daysInStage = 0]
    G --> I[Create Activity Entry: Deal Demoted]
    G --> J[Log Permanent Audit: STAGE_DEMOTED]
    J --> K[Display Sonner Warning Toast]
```

---

## 6. Terminal States: Closed Won vs. Closed Lost

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

---

## 7. Automated Rebuy & Renewal Generation Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as CRM Client / Timer
    participant API as Express API (/api/deals/check-renewals)
    participant DealSvc as dealService.js
    participant DB as PostgreSQL (Prisma)
    participant TskSvc as taskService.js
    participant Audit as AuditLog Service

    App->>API: POST /api/deals/check-renewals
    API->>DealSvc: triggerRenewalCheck()
    DealSvc->>DB: Query deals WHERE isRecurring = true AND status = 'Won'
    DB-->>DealSvc: List of Won Recurring Deals

    loop For each recurring deal
        DealSvc->>DB: Check if active child renewal deal exists
        alt Active child renewal exists
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

---

## 8. Permanent Audit Logging Flow

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

---

## 9. Application Error Recovery Flow

```mermaid
flowchart TD
    A[Runtime Exception in React Component] --> B{Caught by ErrorBoundary?}
    B -- Yes --> C[Render ErrorBoundary Fallback Screen]
    C --> D[Display Diagnostics & Stack Trace]
    C --> E[Provide Options: 'Reload Page' OR 'Reset Demo State']
    
    E -- Reset Demo State --> F[POST /api/state/reset]
    F --> G[Prisma re-seeds database from initialData.js]
    G --> H[Reload Application to Pristine State]

    B -- No (API Level Error) --> I[Global Express Error Middleware]
    I --> J[Return HTTP 4xx/5xx with { error, statusCode }]
    J --> K[Frontend Sonner displays contextual error toast]
```
