<p align="center">
  <a href="README.md">📖 Overview</a> &nbsp;|&nbsp;
  <b>✨ Features</b> &nbsp;|&nbsp;
  <a href="flow.md">🔄 Flow</a> &nbsp;|&nbsp;
  <a href="architecture.md">🏗️ Architecture</a> &nbsp;|&nbsp;
  <a href="db.md">🗄️ Database</a> &nbsp;|&nbsp;
  <a href="api.md">🔌 API</a> &nbsp;|&nbsp;
  <a href="setup-guide.md">🚀 Setup Guide</a>
</p>

---

# Sales CRM — Features Specification

Sales CRM is an enterprise-grade B2B Customer Relationship Management platform engineered for pipeline governance, stage-gate qualification workflows, manager approval ledgers, repeat purchase management, and responsive mobile sales execution.

---

## 1. Capabilities Matrix

| Functional Area | Core Capability | Value Proposition |
|:---|:---|:---|
| **Lead Journey** | Interlocking Chevron Milestone Tracker | Visual Salesforce-style milestone path with stage inspection and inline activity logger |
| **Pipeline Governance** | Stage-Gate Qualification Engine | Eliminates pipeline fiction with mandatory criteria checklists and audit logs |
| **Manager Oversight** | Reviewer Agenda & Approval Ledger | Role-gated stage movements requiring explicit Manager or Admin sign-off |
| **Recurring Revenue** | Rebuy & Renewal Generation Engine | Automated repeat-order generation without erasing historical sales records |
| **Mobile Experience** | 1-Thumb Mobile Console & Adaptive Charts | Bottom action navigation, off-canvas drawer, and mobile comparative bar graph |
| **Sales Velocity** | Interactive Kanban & Table Boards | Stage aging badges, stale warnings, close-date tracking, and dual view modes |
| **Entity Management** | Leads, Accounts, Contacts, Deals | Full B2B lifecycle from prospecting to long-term multi-contact corporate accounts |
| **User Experience (UX)** | 360° Slide-Over Detail Drawer | Context-preserving property editing, verification checks, notes, and task links |
| **Productivity** | Inline Anchored Command Search (`Ctrl+K`) | Real-time cross-entity indexed search without disruptive modal overlays |
| **Security & Compliance** | Role-Based Access Control (RBAC) & Audit Trail | Immutable audit logs capturing every stage transition, override, and approval |

---

## 2. Lead Journey & Milestone Pipeline

The Lead Journey view (`LeadJourneyView.jsx`) provides an account-executive workspace for inspecting and advancing individual opportunities.

```text
[ New Lead ] ──► [ Contacted ] ──► [ Sample Sent ] ──► [ Proposal Sent ] ──► [ Negotiation ] ──► [ Closed Won ]
      │                 │                 │                   │                     │                  │
      ▼                 ▼                 ▼                   ▼                     ▼                  ▼
[ Closed Lost ]   [ Closed Lost ]   [ Closed Lost ]     [ Closed Lost ]       [ Closed Lost ]    [ Buy Again ]
```

### 2.1 Interlocking Chevron Milestone Path
- **Visual Chevron Chain**: Displays the entire opportunity lifecycle as a continuous chain of interlocking milestones.
- **Stage Status Styling**:
  - **Completed Stages**: Solid accent background with checkmark icon.
  - **Current Stage**: Active highlighted chevron with pulse indicator.
  - **Upcoming Stages**: Subtle neutral outline with stage number.
- **Historical Stage Inspection**:
  - Clicking any previously completed stage switches the view into **Inspection Mode**.
  - Displays a dedicated notification banner: *"Viewing historical snapshot of [Stage Name] — Read Only"*.
  - Filters activities, gate checks, and notes to show only what occurred during that stage.
  - Clicking **"Return to Active Stage"** restores live deal progression.

### 2.2 Terminal Diagnostic Banners
- **Closed Lost Off-Ramp Banner**:
  - Highlights lost reason category (e.g., `Price / Budget`, `Competitor Won`, `No Need`).
  - Displays rep post-mortem notes and root-cause summary.
- **Closed Won Replenishment Banner**:
  - Celebrates closed revenue and displays account lifetime value.
  - Shows renewal cycle countdown (e.g., *"Next 60-day rebuy cycle triggers on [Date]"*).
  - Provides a direct link to the spawned child rebuy deal.

### 2.3 Inline Activity Composer
- Reps can log interactions directly inside the journey page without opening modal dialogs:
  - **Call Logger**: Inbound vs. Outbound toggle, duration, outcome, and notes.
  - **Meeting Logger**: Agenda, attendees, and meeting minutes.
  - **Email Logger**: Subject line, recipient, and communication summary.
  - **Quick Note**: Internal qualitative commentary.
- Automatically captures current timestamp, user ID, user name, and links to the active stage.

---

## 3. Stage-Gate Qualification Engine

Stage gates enforce rigorous sales hygiene, preventing deals from advancing without satisfying objective verification criteria.

### 3.1 Qualification Gate Checklists
Advancing an opportunity requires completing stage-specific binary (Yes/No) questions:

| Transition | Mandatory Verification Checklist |
|:---|:---|
| **New Lead ➔ Contacted** | Direct dialogue established; decision-maker identity confirmed |
| **Contacted ➔ Sample Sent** | Sample evaluation criteria agreed; budget availability validated |
| **Sample Sent ➔ Proposal Sent** | Sample testing approved; commercial quote requested with technical specs |
| **Proposal Sent ➔ Negotiation** | Quote reviewed by economic buyer; pricing tiers and terms under review |
| **Negotiation ➔ Closed Won** | Final contract executed; official Purchase Order (PO) received |

### 3.2 Automated Lost Routing on Gate Failure
- If critical criteria fail, the engine routes the deal directly to **Closed Lost**.
- Requires selecting a mandatory **Lost Reason Category**:
  - `Price / Budget`
  - `Competitor Won`
  - `Lack of Authority`
  - `No Current Need`
  - `Product Capability Gap`
- Enforces mandatory **Rep Observation Notes** to preserve qualitative learning for post-mortems.

### 3.3 Backward Stage Demotion Governance
- Moving a deal backward (e.g., `Negotiation` back to `Proposal Sent`) requires an explicit **Demotion Reason**.
- Prevents unexplained pipeline slippage.
- Generates an immutable `STAGE_DEMOTED` audit log and resets `daysInStage` to zero.

---

## 4. Manager Approval Ledger & Review Queue

Stage movements submitted by Sales Reps enter a governed approval queue.

### 4.1 Role-Gated Transition Lifecycle
1. **Rep Submission**: Sales Rep completes checklist criteria. The deal enters `Pending Review` status.
2. **Reviewer Task Generation**: System automatically creates a `[Stage Approval Required]` task assigned to active Managers and Admins.
3. **Task Payload**: Includes target stage path, rep criteria responses (JSON checklist), observation notes, and submission metadata.
4. **Manager One-Click Resolution**:
   - **`[ Approve & Move Stage ]`**: Advances deal to target stage, marks task completed, and logs `STAGE_APPROVED`.
   - **`[ Reject ]`**: Reverts deal out of pending status, retains current stage, records manager feedback, and logs `APPROVAL_REJECTED`.

### 4.2 Admin Direct Override
- Administrators can perform direct drag-and-drop movements on the Kanban board.
- Direct movement prompts for a mandatory **Audit Override Reason**.
- Bypasses the pending queue while logging a permanent `STAGE_OVERRIDE` audit event.

---

## 5. Rebuy & Recurring Order Architecture

Sales CRM treats recurring revenue as a core architecture rather than an afterthought.

### 5.1 Non-Destructive Closed Won Preservation
- Closing a deal as `Closed Won` locks its transaction value, win date, and velocity permanently.
- The record is never recycled or overwritten for repeat orders.

### 5.2 Automated Rebuy Generation
- When a recurring deal (`isRecurring: true`) is marked Won:
  - Generates a new child deal tied via `parentDealId`.
  - Places the deal into the **Buy Again (Renewal)** stage (`stg-7`).
  - Sets expected close date based on the account's renewal period (e.g., 60 days).
  - Inherits corporate account, primary contact, currency, and baseline contract value.
  - Appends `(Renewal Rebuy)` to the title for immediate recognition.

### 5.3 Automated Renewal Outreach Tasks
- Generates a scheduled reminder:
  - **Title**: `[Rebuy Outreach] Review renewal contract with {Account Name}`.
  - **Due Date**: Set 3 days before renewal cycle maturity.
  - Prompts account reps to initiate retention discussions early.

### 5.4 Renewal Engine Service (`checkRenewals`)
- Automated background evaluation queries active won deals against current timestamps.
- When `diffDays >= recurrenceDays` and no active renewal deal exists, the engine generates the repeat order opportunity automatically.

---

## 6. Responsive Mobile Experience

Built for field reps and sales executives on mobile devices (<768px).

### 6.1 1-Thumb Bottom Navigation Bar
- High-priority bottom navigation bar anchored to the bottom edge of mobile viewports.
- Direct access to primary modules:
  - 📊 **Dashboard**: Metrics & comparative charts
  - 🔄 **Pipeline**: Kanban & table views
  - 👥 **Leads**: Prospect ledger & conversions
  - 📋 **Tasks**: Follow-up agenda & manager approvals
- Large touch targets (48px+) optimized for one-handed operation.

### 6.2 Off-Canvas Navigation Drawer
- Hamburger button in the header triggers a sleek slide-out drawer with backdrop blur.
- Hosts secondary navigation modules:
  - 🏢 Corporate Accounts (Companies)
  - 📇 Contact Directory
  - 📈 Governance & Lost Reports
  - ⚙️ Branding & Stage Customization
  - 👤 Active User / Persona Switcher

### 6.3 Executive Horizontal Comparative Bar Graph
- Solves mobile chart crowding on narrow viewports:
  - Includes a `[Bars] | [Columns]` view mode toggle on the Dashboard.
  - **Horizontal Bars Mode**: Renders comparative progress bars displaying stage name, deal count, and total accumulated value.
  - Prevents compressed, unreadable vertical columns on mobile screens.

### 6.4 Touch-Friendly Kanban Board
- Horizontal touch scrolling with stage snapping.
- Compact opportunity cards showing deal value, aging badges, and touch-optimized stage action buttons.

---

## 7. Multi-Entity CRM Management

### 7.1 Leads Pipeline
- **Inbound vs. Outbound Classification**: Dedicated flag tracking marketing inbound vs. outbound outreach.
- **Qualification Lifecycle**: Progression through `New` ➔ `Working` ➔ `Qualified` ➔ `Unqualified` ➔ `Converted`.
- **Title Validation**: Rejects non-descriptive or purely numeric entries (e.g., `12345`).
- **One-Click Conversion**: Converts a qualified lead into a linked **Deal**, **Company**, and **Contact** simultaneously.

### 7.2 Corporate Accounts (Companies)
- Industry categorization, corporate website, address, and operational notes.
- Rolled-up financial metrics: lifetime won value, open pipeline value, and total active deals.

### 7.3 Contacts Directory
- Full stakeholder profiles: job title, corporate email, phone, and account affiliation.
- **Bulk CSV Import**: Import contacts with automatic deduplication by email and phone number.

### 7.4 Follow-Ups & Task Agenda
- Categorized types: `Call`, `Meeting`, `Renewal Check-in`, `Approval`, `Email`.
- Dual scope filtering:
  - **My Tasks**: Individual rep deliverables.
  - **Team Agenda**: Executive view of all pending organizational follow-ups and approvals.

### 7.5 Unified Timeline Feed
- Single chronological interaction stream aggregating:
  - Calls logged (with duration and direction).
  - Scheduled and completed meetings.
  - Stage promotions, approvals, and demotions.
  - Internal qualitative notes.

---

## 8. User Experience (UX) & Ergonomics

### 8.1 360° Slide-Over Detail Drawer
- Side sheet preserving board/table scroll position while editing entities:
  - **Tab 1: Overview & Property Editor**: Deal value, currency, close date, account links.
  - **Tab 2: Stage Gate Verification**: Checklist verification and approval statuses.
  - **Tab 3: Notes & Interaction Logger**: Timeline activity logging.
  - **Tab 4: Connected Tasks**: Linked follow-ups and resolution actions.

### 8.2 Inline Anchored Command Search (`Ctrl+K` / `⌘K`)
- Instant search dropdown anchored directly beneath the header search bar.
- Unified search index across Deals, Leads, Contacts, and Companies.
- Full keyboard navigation (Arrow keys, Enter, Escape).

### 8.3 Non-Blocking Sonner Toast System
- Clean, accessible toast notifications with contextual actions (`Undo`, `View Deal`).
- Eliminates disruptive browser `alert()` or `confirm()` modals.

### 8.4 Crash Resilience & Error Boundaries
- **ErrorBoundary.jsx**: Catches runtime rendering exceptions and provides a one-click **"Reset Demo State"** button.
- **NotFoundView.jsx**: Clean 404 fallback for missing routes or invalid record IDs.

---

## 9. Role-Based Access Control (RBAC)

| Capability | Admin | Manager | Sales Rep |
|:---|:---:|:---:|:---:|
| View Leads, Deals, Accounts, Contacts | Full Access | Full Access | Full Access |
| Create & Update Entities | Yes | Yes | Yes |
| Log Activities & Internal Notes | Yes | Yes | Yes |
| Submit Stage Gate Checklists | Yes | Yes | Yes |
| Direct Kanban Drag-and-Drop Promotion | Yes (Override) | No (Gated) | No (Gated) |
| Approve / Reject Stage Gate Requests | Yes | Yes | No |
| View Team Agenda & Approval Tasks | Full Access | Full Access | Assigned Only |
| View Governance Audit Ledger | Full Access | Full Access | No |
| Modify Branding & Pipeline Stages | Yes | No | No |
| Reset System Demo State | Yes | No | No |

---

## 10. Automated Testing & Quality Assurance

The codebase includes comprehensive automated testing:

### 10.1 End-to-End Tests (Playwright) — 14 Tests
- **`e2e/crm-features.spec.js`**: Pipeline navigation, detail drawer inspection, filter pills, search bar, and test lead cleanup.
- **`e2e/lead-journey.spec.js`**: Chevron milestone rendering, past stage historical inspection, and inline activity composer logging.
- **`e2e/mobile-responsive.spec.js`**: Mobile viewport rendering (390x844), bottom navigation bar, off-canvas drawer toggling, and dashboard bar graph mode switcher.

### 10.2 Unit & Integration Tests (Vitest) — 32 Tests
- **`tests/validation.test.js`**: Zod validation schemas for all entities.
- **`tests/stageTransition.test.js`**: Transition rules, backward demotions, and stage color normalization.
- **`tests/leadJourney.test.js`**: Lead Journey data transforms, milestone statuses, and stage grouping.
- **`tests/timelineService.test.js`**: Unified customer activity timeline aggregation.
- **`tests/followUpEngine.test.js`**: Automated follow-up rules and overdue checks.
- **`tests/taskService.test.js`**: Task resolution and manager approval workflows.
