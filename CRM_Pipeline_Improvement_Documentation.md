# CRM Pipeline Improvement & Business Logic Documentation

## 1. Purpose

This document defines the recommended sales-pipeline architecture and business logic for the CRM project.

The objective is to make the CRM logically consistent, backend-enforced, auditable, scalable for repeat purchases, and useful for sales analytics.

The existing project already contains several strong CRM features, including leads, deals, contacts, companies, activities, tasks, stage gates, approvals, lost reasons, and renewal automation.

The recommendations below focus on improving the existing implementation rather than rebuilding it from scratch.

---

## 2. Recommended CRM Architecture

```text
COMPANY
   |
   +---- CONTACT
   |
   +---- LEAD
            |
            v
        DEAL / OPPORTUNITY
            |
            v
        PIPELINE STAGE
            |
            +---- Activities
            +---- Tasks
            +---- Notes
            +---- Stage Gates
            +---- Approvals
```

### Entity responsibilities

| Entity | Responsibility |
|---|---|
| Company | Organization/customer account |
| Contact | Individual person associated with a company |
| Lead | Potential business/customer before qualification |
| Deal | Specific sales opportunity |
| Pipeline Stage | Current position of a deal |
| Activity | Something that happened |
| Task | Something that needs to happen |
| Stage Gate | Conditions required before advancing |
| Approval | Manager/admin decision |
| Customer | Established relationship after a successful sale |

A company can have many contacts and many sales opportunities. A customer can also make multiple purchases over time, so the customer, lead, and individual sale should not be the same record.

---

## 3. Final Pipeline

```text
New Lead
    |
    v
Contacted
    |
    v
Sample Sent
    |
    v
Proposal Sent
    |
    v
Negotiation
    |
    +------------------+
    |                  |
    v                  v
Closed Won        Closed Lost
    |
    v
Customer
    |
    v
New Rebuy Opportunity
```

Closed Lost must be available from every active stage:

```text
New Lead -----------> Closed Lost
Contacted ----------> Closed Lost
Sample Sent ---------> Closed Lost
Proposal Sent -------> Closed Lost
Negotiation ---------> Closed Lost
```

The pipeline should not be completely linear. Some customers may not need a sample, so `Contacted -> Proposal Sent` can be valid when the business rules allow it.

---

## 4. Stage Transition Matrix

| Current Stage | Allowed Next Stage |
|---|---|
| New Lead | Contacted, Closed Lost |
| Contacted | Sample Sent, Proposal Sent, Closed Lost |
| Sample Sent | Proposal Sent, Closed Lost |
| Proposal Sent | Negotiation, Closed Won, Closed Lost |
| Negotiation | Closed Won, Closed Lost |
| Closed Won | Creates future Rebuy Opportunity |
| Closed Lost | New Opportunity if genuinely reactivated |
| Rebuy | Proposal Sent / Negotiation / Closed Won / Closed Lost |

The backend should explicitly define these transitions instead of assuming the next stage is simply the next item in an array.

---

## 5. New Lead

### Purpose

A new potential customer has entered the CRM but has not yet been meaningfully engaged.

### Required information

```text
Lead ID
Name
Company
Email
Phone
Lead Source
Owner
Requirement
Created Date
```

### Process

```text
Lead Created
     |
     v
Assign Salesperson
     |
     v
Create First-Contact Task
     |
     v
Salesperson Attempts Contact
```

### Allowed outcomes

```text
New Lead
   |
   +----> Contacted
   |
   +----> Closed Lost
```

### Improvement

Automatically create a first-follow-up task when a lead is created.

**Benefit:** Prevents new leads from being forgotten.

---

## 6. Contacted

Contacted should mean meaningful communication has occurred, not merely that a salesperson clicked a call button.

### Information to collect

- Customer requirement
- Product
- Quantity
- Budget
- Timeline
- Decision maker
- Competitor
- Customer interest
- Next action

### Process

```text
Contact Attempt
      |
      v
Customer Responds
      |
      v
Requirement Discussed
      |
      v
Activity Logged
      |
      v
Contacted
```

### Allowed outcomes

```text
Contacted
   |
   +----> Sample Sent
   |
   +----> Proposal Sent
   |
   +----> Closed Lost
```

### Suggested stage-gate requirements

- Decision maker identified
- Genuine use case confirmed
- Budget range known
- Timeline realistic
- Next step identified

---

## 7. Sample Sent

The customer has been provided with a sample/product for evaluation.

### Internal sample lifecycle

Do not create a separate pipeline stage for every sample action. Use a sub-status:

```text
Sample Sent

    Preparing
       |
    Dispatched
       |
    Delivered
       |
 Feedback Pending
       |
 Feedback Received
```

### Process

```text
Sample Requested
      |
      v
Sample Prepared
      |
      v
Sample Dispatched
      |
      v
Sample Delivered
      |
      v
Customer Evaluation
      |
      v
Feedback
```

### Allowed outcomes

```text
Sample Sent
   |
   +----> Proposal Sent
   |
   +----> Closed Lost
```

### Improvement

Create an automatic feedback task after sample delivery.

**Benefit:** Ensures the salesperson follows up.

---

## 8. Proposal Sent

The customer has received a formal commercial proposal.

### Proposal data

```text
Proposal ID
Deal ID
Version
Amount
Discount
Validity Date
Payment Terms
Delivery Terms
Sent Date
```

### Process

```text
Customer Requirement Confirmed
          |
          v
Proposal Created
          |
          v
Proposal Sent
          |
          v
Follow-up Task Created
```

### Improvement: proposal expiry tracking

Example:

```text
Proposal Valid Until: 15 September
Current Date: 12 September

CRM:
Proposal expires in 3 days
```

**Benefit:** Reduces opportunities lost because quotations were forgotten or expired.

---

## 9. Negotiation

The customer and salesperson are actively discussing commercial or contractual terms.

### Track

- Original proposal amount
- Customer counter-offer
- Salesperson counter-offer
- Discount
- Payment terms
- Delivery terms
- Objections
- Competitor information
- Decision maker
- Expected close date

### Example

```text
Original Proposal: ₹6,00,000
Customer Counter: ₹5,00,000
Sales Offer: ₹5,50,000
Final: ₹5,40,000
```

### Outcomes

```text
Negotiation
    |
    +----> Closed Won
    |
    +----> Closed Lost
```

**Benefit:** Management can analyze discounts, objections, and pricing pressure.

---

## 10. Closed Won

Closed Won should represent a confirmed business conversion.

Depending on the business, this may require:

- Purchase order
- Signed agreement
- Firm order confirmation
- Payment
- Other clearly defined business confirmation

### Process

```text
Customer Accepts
      |
      v
Final Terms Confirmed
      |
      v
PO / Confirmation
      |
      v
Closed Won
```

### At Closed Won

Capture:

```text
Final Deal Value
Product
Quantity
Final Price
Closing Date
Order Number
Payment Terms
Customer
```

### Recommended automation

```text
Closed Won
    |
    +----> Customer relationship
    +----> Order/transaction
    +----> Post-sale task
    +----> Future rebuy schedule
```

---

# 11. Critical Improvement — Rebuy Architecture

## Current problem

The existing renewal concept changes the existing deal into a renewal/rebuy stage.

Conceptually:

```text
Deal #001
    |
    v
Closed Won
    |
    v
Buy Again / Renewal
```

This can overwrite the original deal lifecycle.

## Recommended architecture

A rebuy must create a **new opportunity/deal**.

```text
CUSTOMER
   |
   +---- Deal #001
   |       |
   |       +---- Closed Won
   |
   +---- Deal #002
           |
           +---- Rebuy
           |
           +---- Proposal
           |
           +---- Negotiation
           |
           +---- Closed Won
```

The original deal remains permanently Closed Won.

### Why this change is necessary

The original transaction must remain historically accurate.

If the same deal is moved from Closed Won to Rebuy, the CRM loses the true history of the original sale.

### Benefits

- Customer lifetime value
- Number of purchases
- Repeat purchase rate
- Average order value
- Revenue from existing customers
- Rebuy conversion rate
- Complete customer purchase history

---

# 12. Closed Lost

Closed Lost is a terminal state for an unsuccessful opportunity.

```text
New Lead ------+
Contacted -----+
Sample Sent ---+
Proposal Sent -+----> Closed Lost
Negotiation ---+
```

## Lost reason must be mandatory

Recommended reasons:

```text
Price Too High
Competitor Selected
Budget Unavailable
Product Mismatch
No Response
Requirement Cancelled
Timeline Changed
Decision Maker Unavailable
Technical Issue
Other
```

Also store a free-text note.

### Benefit

Management can understand why opportunities are being lost.

---

# 13. Stage Gates

The existing Stage Gate concept should be retained.

A stage gate ensures that a deal cannot advance merely because a salesperson wants to move it.

## Recommended workflow

```text
User Requests Transition
          |
          v
Check Permission
          |
          v
Check Transition
          |
          v
Check Stage Gate
          |
          v
Manager Approval if Required
          |
          v
Update Stage
```

### Recommended gate criteria

| Transition | Example Requirements |
|---|---|
| New Lead -> Contacted | Contact attempt, decision maker, use case |
| Contacted -> Sample | Product/specification, quantity, evaluation process |
| Sample -> Proposal | Technical acceptance, price target, decision maker |
| Proposal -> Negotiation | Customer feedback, blocker, approval information |
| Negotiation -> Won | Final terms, PO/confirmation, delivery terms |

---

# 14. Critical Improvement — Backend Must Enforce Stage Rules

## Current risk

If the frontend directly updates the stage, a user may potentially bypass Stage Gate rules.

For example:

```text
stageName = "Closed Won"
```

could be submitted without completing the required process.

## Recommended solution

Create a dedicated stage-transition operation:

```text
POST /api/deals/:id/stage-transition
```

The backend should receive:

```text
Current Stage
Target Stage
User
Gate Answers
Reason
```

Then execute:

```text
Validate User Permission
        |
        v
Validate Transition
        |
        v
Validate Stage Gate
        |
        v
Check Approval Requirement
        |
        v
Approve / Reject
        |
        v
Update Deal
        |
        v
Create Activity
        |
        v
Create Audit Log
```

**Benefit:** The CRM remains secure and logically correct even if the frontend is bypassed.

---

# 15. Prevent Invalid Stage Jumping

The UI should not allow arbitrary movement such as:

```text
New Lead -> Negotiation
```

or:

```text
Sample Sent -> Closed Won
```

unless a specifically defined business rule allows it.

If an invalid transition is requested:

```text
Current:
New Lead

Requested:
Negotiation

System:
Transition not allowed.

Allowed next stages:
Contacted
Closed Lost
```

The backend must enforce this.

---

# 16. Admin Override

Administrators sometimes need to correct records.

Admin override should therefore exist, but it must be auditable.

### Recommended flow

```text
Admin Override
      |
      v
Reason Required
      |
      v
Stage Changed
      |
      v
Audit Log
```

Example:

```text
Admin:
Sales Manager

Change:
Proposal Sent -> Closed Won

Reason:
Signed PO was received outside the CRM.

Timestamp:
05 September 2026
```

**Benefit:** Allows legitimate corrections without creating invisible changes.

---

# 17. Manager Approval

The existing manager/admin approval system should be retained.

Recommended flow:

```text
Salesperson
    |
    v
Stage Gate
    |
    v
Pending Review
    |
    v
Manager
   / Approve Reject
```

Rejection should be actionable:

```text
Rejected
    |
    v
Reason
    |
    v
Salesperson fixes missing information
    |
    v
Resubmit
```

**Benefit:** Approval becomes a real workflow rather than a dead end.

---

# 18. Backward Stage Movement

Backward movement can be valid, but it must require a reason.

Example:

```text
Negotiation
     |
     v
Sample Sent
```

Possible reasons:

- Sample re-testing required
- Decision maker changed
- Requirements changed
- Technical issue
- Customer requested another evaluation

**Benefit:** Management can identify where the sales process is breaking down.

---

# 19. Lead Status vs Deal Stage

These must be clearly separated.

## Lead Status

Used for the lead lifecycle:

```text
New
Working
Qualified
Unqualified
Converted
```

## Deal Stage

Used for the actual sales opportunity:

```text
New Lead
Contacted
Sample Sent
Proposal Sent
Negotiation
Closed Won
Closed Lost
```

### Example

```text
Lead:
Status = Converted

Deal:
Stage = Proposal Sent
```

This is valid. The lead has become a sales opportunity, while the opportunity is still being worked.

---

# 20. Lead-to-Deal Relationship

The relationship should always use stable IDs.

### Correct

```text
Lead:
id = LD-101

Deal:
leadId = LD-101
```

### Avoid

Matching records using names or titles:

```text
deal.title === lead.title
```

### Why?

Two leads can have identical titles.

ID-based relationships provide:

- Correct data association
- Reliable reporting
- Easier database migration
- No duplicate-title problems

---

# 21. Activities

The existing activity system should remain.

Recommended activity types:

```text
Call
Email
Meeting
Note
Sample
Proposal
Follow-up
```

Activities should be associated with the relevant lead, deal, contact, or company.

### Example timeline

```text
10:00 AM
Call completed

11:30 AM
Sample dispatched

Day 2
Email sent

Day 5
Follow-up call

Day 7
Proposal sent
```

**Benefit:** The CRM can explain why a deal is in a particular stage.

---

# 22. Automatic Task Creation

The CRM should create tasks based on important events.

## Lead created

```text
Task:
Contact lead

Due:
Tomorrow
```

## Sample delivered

```text
Task:
Collect sample feedback

Due:
3 days
```

## Proposal sent

```text
Task:
Follow up on proposal

Due:
3 days
```

## Negotiation started

```text
Task:
Follow up with decision maker

Due:
2 days
```

## Closed Won

```text
Task:
Post-sale follow-up

Due:
7 days
```

**Benefit:** The CRM becomes proactive rather than simply storing information.

---

# 23. Stage Aging

Track how long a deal has remained in each stage.

Example:

```text
Negotiation

Days in Stage: 17
```

Suggested interpretation:

```text
0–7 days     Normal
8–14 days    Attention
15+ days     At Risk
```

Thresholds should be configurable.

**Benefit:** Management can identify stuck opportunities.

---

# 24. Stale Deal Detection

Track:

```text
lastActivityDate
```

Example:

```text
Last Activity:
12 days ago
```

CRM should show:

```text
WARNING:
No activity for 12 days.
```

**Benefit:** Salespeople can prioritize inactive opportunities.

---

# 25. Expected Close Date

Every active deal should have:

```text
expectedCloseDate
```

If:

```text
Expected Close:
04 September

Current Date:
05 September

Stage:
Negotiation
```

show:

```text
Overdue Closing Date
```

**Benefit:** Improves sales forecasting.

---

# 26. Deal Value History

Do not only store the current deal value.

Track important changes.

Example:

```text
Proposal:
₹6,00,000

Negotiation:
₹5,60,000

Final:
₹5,40,000
```

**Benefit:** Management can measure average discount, pricing pressure, and revenue reduction during negotiation.

---

# 27. Audit Logging

Every important state-changing operation should be recorded.

Recommended events:

- Stage changes
- Stage demotions
- Admin overrides
- Lost deals
- Approvals
- Rejections
- Deal value changes
- Owner changes
- Rebuy creation
- Important data corrections

Example:

```text
User:
Salesperson

Action:
Stage Change

Deal:
ABC Industries

From:
Proposal Sent

To:
Negotiation

Reason:
Customer requested pricing discussion

Timestamp:
05 September 2026 14:32
```

---

# 28. Rebuy Automation — Final Design

The renewal automation should work as follows:

```text
Closed Won
     |
     v
Is recurring?
    /   No   Yes
       |
       v
Calculate next rebuy date
       |
       v
Rebuy reminder
       |
       v
Create new opportunity
       |
       v
Rebuy
       |
       v
Proposal
       |
       v
Negotiation
       |
       v
Closed Won
```

Example:

```text
Deal #001
Closed Won

Expected rebuy:
60 days

Day 50:
Rebuy approaching

Day 60:
Create Deal #002

Deal #002:
Rebuy
```

---

# 29. Recommended Backend API Structure

Basic CRUD operations can remain, but business operations should have dedicated endpoints.

## Deals

```text
POST /api/deals
GET /api/deals
PUT /api/deals/:id
```

## Stage transition

```text
POST /api/deals/:id/stage-transition
```

## Stage-gate approval

```text
POST /api/stage-gate-checks/:id/approve
POST /api/stage-gate-checks/:id/reject
```

## Rebuy

```text
POST /api/deals/:id/create-rebuy
```

## Closed Lost

```text
POST /api/deals/:id/close-lost
```

This makes the API represent real business operations instead of only generic CRUD updates.

---

# 30. Recommended Complete Flow

```text
                    +-------------+
                    |  NEW LEAD   |
                    +------+------+
                           |
                    First contact
                           |
                           v
                    +-------------+
                    |  CONTACTED  |
                    +------+------+
                           |
                     Qualification
                           |
                    +------+------+
                    |             |
                 Sample        Proposal
                    |             |
                    v             |
             +-------------+      |
             | SAMPLE SENT |      |
             +------+------+\     |
                    |       \     |
             Sample accepted \    |
                    |         \   |
                    +----------+---+
                               |
                               v
                       +----------------+
                       | PROPOSAL SENT  |
                       +-------+--------+
                               |
                            Feedback
                               |
                               v
                        +-------------+
                        | NEGOTIATION |
                        +------+------+
                               |
                         Final agreement
                           /                                    /                                     v              v
                +-------------+  +-------------+
                | CLOSED WON  |  | CLOSED LOST |
                +------+------+\ +-------------+
                       |
                       v
                    CUSTOMER
                       |
                  Rebuy due?
                       |
                       v
                NEW OPPORTUNITY
                       |
                       v
                     REBUY
                       |
                       v
                   PROPOSAL
                       |
                       v
                  NEGOTIATION
                       |
                       v
                  CLOSED WON
```

---

# 31. Universal Stage-Change Workflow

Every stage transition should follow:

```text
User Action
     |
     v
Permission Check
     |
     v
Transition Validation
     |
     v
Stage Gate
     |
     v
Manager Approval
(if required)
     |
     v
Stage Update
     |
     v
Activity Log
     |
     v
Task Creation
     |
     v
Audit Log
```

This should become the central business rule of the CRM.

---

# 32. Priority Implementation Roadmap

## Priority 1 — Must Fix

### 1. Rebuy architecture

**Change:** Create a new deal for every rebuy.

**Reason:** Preserve historical sales records.

**Benefit:** Correct customer purchase history and lifetime-value reporting.

### 2. Backend stage-transition validation

**Change:** Move transition enforcement to the backend.

**Reason:** Frontend-only validation can be bypassed.

**Benefit:** Secure and trustworthy pipeline.

### 3. Remove title-based Deal matching

**Change:** Use stable IDs and explicit relationships.

**Reason:** Titles are not unique.

**Benefit:** Prevent incorrect data associations.

### 4. Separate Lead Status and Deal Stage

**Change:** Clearly define their responsibilities.

**Reason:** Avoid inconsistent lifecycle data.

**Benefit:** Better reporting and cleaner architecture.

---

## Priority 2 — Strongly Recommended

### 5. Explicit transition matrix

Controls valid stage movements.

### 6. Mandatory Closed Lost reason

Improves lost-deal analytics.

### 7. Audited Admin Override

Allows corrections without losing accountability.

### 8. Automatic follow-up tasks

Prevents leads from becoming inactive.

### 9. Proposal expiry tracking

Prevents forgotten quotations.

### 10. Stage aging

Identifies stuck opportunities.

### 11. Stale-deal detection

Highlights deals without recent activity.

### 12. Expected-close alerts

Improves forecasting.

---

## Priority 3 — Advanced Improvements

### 13. Deal value history

Tracks negotiation impact.

### 14. Automated rebuy reminders

Improves repeat sales.

### 15. Customer lifetime value

Measures long-term customer value.

### 16. Rebuy conversion analytics

Measures retention effectiveness.

---

# 33. What Should NOT Be Rebuilt

The following existing concepts are good and should be retained:

- Stage Gate system
- Manager approval
- Demotion reasons
- Lost reason tracking
- Activity timeline
- Tasks
- Pipeline/Kanban view
- Role-based access
- Governance/audit features
- Renewal detection concept

The objective is to strengthen the existing system, not replace these features.

---

# 34. Final Design Principle

The CRM should evolve from:

```text
A UI that lets users change stages
```

into:

```text
A business engine that controls,
validates, explains, and records
why a stage changes.
```

The frontend should provide the user experience.

The backend should enforce the business rules.

The database should preserve the complete history.

The activity/task system should drive follow-up.

The stage-gate system should control progression.

The audit system should provide accountability.

The rebuy system should create new opportunities instead of modifying historical deals.

This combination produces a more reliable and scalable CRM.
