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

# Sales CRM — Comprehensive Features Documentation

Sales CRM is an enterprise-grade B2B Customer Relationship Management platform engineered for pipeline governance, stage-gate qualification workflows, manager approval ledgers, repeat purchase management, and multi-entity relationship tracking.

---

## 1. Executive Summary & Capabilities Matrix

| Functional Area | Core Capability | Key Value Proposition |
|:---|:---|:---|
| **Pipeline Governance** | Stage-Gate Qualification Engine | Eliminates pipeline fiction with mandatory criteria checklists and audit logs |
| **Manager Oversight** | Reviewer Agenda & Approval Ledger | Role-gated stage movements requiring explicit Manager/Admin sign-off |
| **Recurring Revenue** | Rebuy & Renewal Generation Engine | Automated repeat-order generation without erasing historical sales records |
| **Sales Velocity** | Interactive Kanban & List Board | Drag-and-drop interface with stage aging badges, stale warnings, and close-date tracking |
| **Entity Management** | Leads, Accounts, Contacts, Deals | End-to-end B2B sales lifecycle from cold prospecting to long-term enterprise account |
| **User Experience (UX)** | 360° Slide-Over Detail Drawer | Context-preserving property editing, verification checks, note-taking, and task links |
| **Productivity** | Inline Anchored Command Search (`Ctrl+K`) | Real-time cross-entity indexed search without disruptive modal overlays |
| **Security & Governance** | Role-Based Access Control (RBAC) & Audit Trail | Immutable audit logs capturing every stage transition, override reason, and approval |

---

## 2. Stage-Gate Qualification Engine

The qualification engine ensures opportunities do not advance across the pipeline on rep intuition alone. Advancement requires satisfying stage-specific objective criteria.

### 2.1 Qualification Gate Checklists
Each pipeline stage defines mandatory binary (Yes/No) questions that must be answered before a deal can progress to the next stage:

```text
[ Contacted ] ──( Gate: Decision Maker & Budget )──► [ Sample Sent ]
[ Sample Sent ] ──( Gate: Sample Feedback & Specs )──► [ Proposal Sent ]
[ Proposal Sent ] ──( Gate: Commercial Terms & Validity )──► [ Negotiation ]
[ Negotiation ] ──( Gate: Contract Terms & PO )──► [ Closed Won ]
```

- **Objective Criteria Verification**:
  - **Decision-Maker Confirmed**: Has the economic buyer or authorized decision-maker been engaged directly?
  - **Budget & Timeline Validated**: Has the customer allocated budget and defined an implementation schedule?
  - **Product Fit & Technical Spec Approved**: Has technical evaluation or sample testing satisfied specifications?
  - **Commercial Terms Aligned**: Are pricing tiers, credit terms, and delivery schedules agreed upon?
- **Partial Gate State Persistence**:
  - Reps can partially save answers in the `partialGateState` JSON attribute on the deal record, returning later to complete criteria without losing progress.

### 2.2 Automated Lost Routing on Gate Failure
- If an opportunity fails critical qualification requirements (e.g., customer lacks budget, champion leaves company, no product fit), the engine routes the record directly to **Closed Lost**.
- Prompts for a mandatory **Lost Reason Category** (e.g., `Price / Budget`, `Competitor Won`, `Lack of Authority`, `No Current Need`, `Product Capability Gap`).
- Mandates **Rep Observation Notes** to capture granular qualitative context for post-mortem analysis.

### 2.3 Backward Stage Demotion & Governance
- Backward pipeline movement (e.g., moving a deal from `Negotiation` back to `Proposal Sent` or `Sample Sent`) requires an explicit **Demotion Reason**.
- Prevents unexplained pipeline slippage and ensures historical forecasting models reflect reality.
- Generates a permanent `STAGE_DEMOTED` audit log and an automated timeline activity entry.

---

## 3. Manager Approval & Task Ledger

To enforce sales hygiene, stage transitions initiated by Sales Reps enter a governed approval queue rather than transitioning immediately.

### 3.1 Role-Gated Transition Lifecycle
1. **Rep Submission**:
   - A Sales Rep completes stage gate questions or initiates a stage advancement.
   - The deal enters `Pending Review` status.
   - The stage on the Kanban board visually indicates that review is in progress.
2. **Reviewer Task Generation**:
   - The system automatically creates a `[Stage Approval Required]` task assigned to active **Managers** and **Admins**.
   - The task payload includes:
     - Target stage path (`fromStageName` ➔ `targetStageName`).
     - Rep qualification answers (JSON checklist).
     - Rep observation notes and business context.
     - Submission timestamp and submitter metadata.
3. **Manager One-Click Resolution**:
   - Managers and Admins can approve or reject the transition directly from the **Tasks & Agenda Ledger** or within the deal's **Detail Drawer**.
   - **Approve & Move Stage**: Advances the deal to the target stage, marks the approval task as completed, and logs a permanent `STAGE_APPROVED` audit event.
   - **Reject**: Reverts the deal out of pending status, retains current stage, marks task as rejected, and alerts the rep with manager feedback.

### 3.2 Admin Direct Override
- Administrators hold authority to perform direct drag-and-drop movements on the Kanban board.
- When an Admin moves a deal directly, the system prompts for a mandatory **Audit Override Reason**.
- Direct transitions bypass the pending review queue while maintaining compliance through an immutable `STAGE_OVERRIDE` audit log entry.

---

## 4. Rebuy & Recurring Order Architecture

In B2B sales (e.g., manufacturing, industrial packaging, FMCG wholesale, SaaS contracts), initial customer acquisition is only the start of the account value. Sales CRM treats recurring revenue as a first-class citizen.

### 4.1 Non-Destructive Closed Won Preservation
- When a deal is marked `Closed Won`, its transaction history, contract value, win date, and stage velocity are permanently preserved for accounting and reporting.
- The record is never recycled or overwritten for future purchases.

### 4.2 Automated Rebuy Generation
- For recurring accounts (`isRecurring: true`), closing a deal triggers the automated rebuy cycle:
  - Generates a new child deal tied to the original transaction via `parentDealId`.
  - Places the new opportunity into the **Buy Again (Renewal)** stage.
  - Automatically calculates expected close dates based on the account's renewal period (e.g., 60 days, 90 days, or system default).
  - Copies corporate account, primary contact, currency, and baseline contract value from the parent deal.
  - Appends `(Renewal Rebuy)` to the deal title for instant identification.

### 4.3 Automated Renewal Outreach Tasks
- When a rebuy deal is generated, the system creates a scheduled task:
  - **Task Title**: `[Rebuy Outreach] Review renewal contract with {Contact Name / Company Name}`.
  - **Due Date**: Automatically set 3 days prior to the renewal cycle horizon.
  - **Task Type**: `Renewal Check-in`.
  - Prompts the account executive to initiate renewal discussions before competitors intervene.

### 4.4 Automated Renewal Engine (`checkRenewals`)
- An automated backend service evaluates active won deals against current timestamps.
- When the recurrence horizon elapses (`diffDays >= recurrenceDays`) and no active renewal deal exists, the engine generates the repeat order opportunity automatically.

---

## 5. Interactive Pipeline Board & Governance

The pipeline board provides visual drag-and-drop opportunity management backed by strict governance controls.

### 5.1 Kanban Board Capabilities
- **Multi-Stage Swimlanes**:
  - `New Lead` (`stg-1`)
  - `Contacted` (`stg-2`)
  - `Sample Sent` (`stg-3`)
  - `Proposal Sent` (`stg-4`)
  - `Negotiation` (`stg-5`)
  - `Buy Again (Renewal)` (`stg-7`)
  - `Closed Won` (`stg-6`)
  - `Closed Lost` (`stg-8`)
- **Stage Metrics at a Glance**:
  - Real-time deal count and total accumulated pipeline value per stage header.
  - Dynamic stage color indicators configured via branding settings.

### 5.2 Card-Level Governance Indicators
- **Stage Aging Badge**: Displays how many days the deal has lingered in its current stage (`daysInStage`).
- **Stale Deal Warning**: Emphasizes deals with no activity for more than 10 days in red badges.
- **Close Date Indicators**:
  - `Overdue`: Red highlight if the expected close date is in the past.
  - `Due Soon`: Amber highlight if closing within the next 7 days.
- **Pending Approval Indicator**: Pulsing banner indicating that a promotion request is under review.

### 5.3 Ergonomic Quick-Filter Pills
Real-time filtering pills allow reps and managers to isolate specific pipeline cohorts in one click:
- **All Deals**: Full pipeline scope.
- **My Deals**: Filtered to deals owned by the currently authenticated user.
- **Stale (>10d)**: Opportunities requiring immediate outreach.
- **Aging in Stage**: Deals exceeding standard stage velocity thresholds.
- **Closing Overdue**: Deals whose expected close date has expired.
- **Renewals Due**: Deals in the renewal pipeline requiring contract extensions.

### 5.4 Dual View Modes: Kanban vs. Table List
- Switch seamlessly between the visual Kanban board and a data-dense, spreadsheet-style table view.
- Table view provides multi-column sorting (Value, Expected Close Date, Created Date, Stage, Owner) and quick pagination.

---

## 6. Multi-Entity CRM Management

### 6.1 Leads Management
- **Inbound vs. Outbound Classification**: Dedicated flag tracking whether a lead came from inbound marketing or cold outbound prospecting.
- **Lead Qualification Lifecycle**: Tracks status progression: `New` ➔ `Working` ➔ `Qualified` ➔ `Unqualified` ➔ `Converted`.
- **Title Validation & Sanity Enforcement**: Rejects non-descriptive or purely numeric titles (e.g., `12345`) to preserve data hygiene.
- **One-Click Lead Conversion**:
  - Converts a qualified lead into an active **Deal**, **Company**, and **Contact** simultaneously.
  - Links all historical interaction notes and activities to the newly created deal.
  - Updates the lead status to `Converted` permanently.

### 6.2 Corporate Accounts (Companies)
- Organizes B2B corporate entities with industry categorization, corporate website, physical address, and custom operational notes.
- Maintains multi-contact hierarchies: view all decision-makers and contacts associated with an account.
- Provides rolled-up account revenue: total lifetime won value, active open pipeline, and historical deal count.

### 6.3 Contact Directory & Communication
- Maintains detailed records of client personnel: full name, corporate email, phone, job title, and account affiliation.
- Custom key-value field support for specialized industry metadata (e.g., procurement role, LinkedIn profile).
- **Bulk CSV Import & Export**: One-click import capability for bulk lead lists with automatic deduplication.

### 6.4 Follow-Ups & Task Agenda
- Categorized task types: `Call`, `Meeting`, `Renewal Check-in`, `Approval`, `Email`.
- Dual scope viewing:
  - **My Tasks**: Individual rep operational follow-ups.
  - **Team Agenda**: Manager-level bird's-eye view across all pending organizational deliverables.
- Time-based filtering: `Overdue`, `Due Today`, `Upcoming`, `Completed`.

### 6.5 Notes & Timeline Activity Feeds
- **Activity Feed**: Comprehensive chronological audit of customer interactions:
  - Calls logged (inbound/outbound flags, duration, call notes).
  - Meetings scheduled and completed.
  - Stage promotions, demotions, and approvals.
  - Contract proposals and email correspondence.
- **Internal Notes**: Rich text internal commentary linked to either Deals, Leads, Companies, or Contacts.

---

## 7. Modern CRM User Experience (UX)

### 7.1 360° Slide-Over Detail Drawer (Sheet UI)
Clicking any Deal or Lead opens an interactive side drawer without navigating away from the Kanban board or list table:
- **Tab 1: Overview & Property Editor**: Live-edit deal value, currency, expected close date, account affiliation, owner assignment, and custom attributes.
- **Tab 2: Stage Gate Verification**: Direct access to qualification checklists, pending approval statuses, and gate submission buttons.
- **Tab 3: Notes & Interaction Logger**: Log a new call, meeting, or internal note directly onto the entity timeline.
- **Tab 4: Connected Tasks**: View, create, and resolve tasks linked directly to this deal or lead.

### 7.2 Inline Anchored Command Search (`Ctrl+K` / `⌘K`)
- Global keyboard shortcut opens an instant search dropdown anchored directly beneath the header search bar.
- Unified indexing across Deals, Leads, Contacts, and Companies.
- Keyboard navigation (Up/Down arrow keys, Enter to select, Escape to close).
- Zero disruptive full-screen modal overlays or background blur.

### 7.3 Non-Blocking Sonner Toast System
- Replaced disruptive native browser alerts (`alert()`, `confirm()`) with rich, non-blocking toast notifications.
- Visual status indicators:
  - `toast.success`: Stage transitions, approvals, record creations.
  - `toast.error`: Validation errors, failed gate requirements.
  - `toast.info`: Background renewal triggers, data sync notices.
- Contextual action buttons inside toasts (e.g., `Undo`, `View Deal`).

### 7.4 System Resilience & Crash Recovery
- **React Error Boundary**: Catches unhandled frontend runtime exceptions, presents technical diagnostics, and provides a one-click **"Reset Demo State"** button to restore healthy operation.
- **NotFoundView (404)**: Gracefully handles non-existent tab routes or missing entity IDs with quick return navigation.
- **Backend API 404 Fallback**: Responds with structured JSON error messages rather than unhandled HTML error dumps.

---

## 8. Role-Based Access Control (RBAC)

The application enforces a 3-tier Role-Based Access Control model:

| Permission / Action | Admin | Manager | Sales Rep |
|:---|:---:|:---:|:---:|
| **View Leads, Deals, Accounts, Contacts** | Full Access | Full Access | Full Access |
| **Create & Update Entities** | Yes | Yes | Yes |
| **Log Activities & Internal Notes** | Yes | Yes | Yes |
| **Submit Stage Gate Checklists** | Yes | Yes | Yes |
| **Direct Kanban Drag-and-Drop Promotion** | Yes (Override) | No (Gated) | No (Gated) |
| **Approve / Reject Stage Gate Requests** | Yes | Yes | No |
| **View Team Agenda & Approval Tasks** | All Users | All Users | Assigned Only |
| **View Governance Audit Ledger** | Full Access | Full Access | No |
| **Modify White-Label Branding & Stage Matrix** | Yes | No | No |
| **Reset System Demo State** | Yes | No | No |

> [!NOTE]
> The top navigation bar includes an interactive **Role Switcher** allowing evaluators to switch between **Alex Vance (Admin)**, **Marcus Vance (Sales Rep)**, and other team members to test role-gated behaviors in real time.

---

## 9. Dashboard, Analytics & Reporting

### 9.1 Executive KPI Scorecards
- **Total Pipeline Value**: Aggregate currency value of all open, active opportunities.
- **Won Revenue**: Accumulated revenue generated from `Closed Won` deals.
- **Win Rate %**: Percentage of terminal deals closed won versus closed lost.
- **Active Deals Count**: Total number of opportunities currently in flight.
- **Stale Deals Count**: Number of opportunities with no logged activity for >10 days.
- **Renewal Pipeline Value**: Total anticipated revenue sitting in the `Buy Again (Renewal)` stage.

### 9.2 Graphical Visualizations & Funnels
- **Stage Distribution Chart**: Breakdown of pipeline volume and deal count across every active pipeline stage.
- **Loss Reason Breakdown**: Categorical analysis of why deals were lost (Pricing, Competitor, Authority, Timing) to identify operational bottlenecks.
- **Sales Velocity**: Tracking average days spent in each stage to pinpoint friction points.
- **Rep Performance Leaderboard**: Comparison of closed revenue, active deal count, and completed activities per sales rep.

---

## 10. White-Label Branding & Customization

The CRM includes a dedicated **Settings** panel allowing businesses to adapt the platform to their brand identity:
- **Application Name & Tagline**: Dynamically displayed in page titles, header branding, and sidebar.
- **Logo Icon Selection**: Choose from popular Lucide icons (e.g., `Building2`, `Briefcase`, `Shield`, `Zap`).
- **Brand Palette (Primary & Accent)**: Real-time customization of primary buttons, active state indicators, and focus rings.
- **Default Renewal Cycle**: Set organizational default repeat purchase intervals (e.g., 30, 60, 90, 180 days).
- **Custom Stage Names & Stage Color Palette**: Configure pipeline stage nomenclature, ordering, and visual badge colors.
- **System State Reset**: One-click re-seeding mechanism to wipe test data and return to pristine demonstration data.
