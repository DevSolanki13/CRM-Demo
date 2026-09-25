<p align="center">
  <a href="README.md">📖 Overview</a> &nbsp;|&nbsp;
  <a href="features.md">✨ Features</a> &nbsp;|&nbsp;
  <a href="flow.md">🔄 Flow</a> &nbsp;|&nbsp;
  <a href="architecture.md">🏗️ Architecture</a> &nbsp;|&nbsp;
  <a href="db.md">🗄️ Database</a> &nbsp;|&nbsp;
  <b>🔌 API</b> &nbsp;|&nbsp;
  <a href="setup-guide.md">🚀 Setup Guide</a>
</p>

---

# Sales CRM — REST API Reference Documentation

This document provides a comprehensive specification of all REST API endpoints provided by the Sales CRM backend server.

---

## 1. Global API Standards

- **Base URL**: `/api`
- **Request Content-Type**: `application/json`
- **Response Content-Type**: `application/json`
- **Validation**: Incoming request payloads are validated using **Zod** schemas.
- **Standard Error Response**:
  ```json
  {
    "error": "Descriptive error message",
    "statusCode": 400,
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
  ```

---

## 2. System State & Health Endpoints

### 2.1 Server Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Returns operational health, server uptime, and timestamp.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "uptime": 1420.5,
    "timestamp": "2026-09-25T18:00:00.000Z"
  }
  ```

### 2.2 Hydrate Full CRM State
- **Endpoint**: `GET /api/state`
- **Description**: Fetches all system entities in a single roundtrip to hydrate frontend state upon initial boot.
- **Response `200 OK`**:
  ```json
  {
    "branding": { ... },
    "users": [ ... ],
    "stages": [ ... ],
    "companies": [ ... ],
    "contacts": [ ... ],
    "leads": [ ... ],
    "deals": [ ... ],
    "tasks": [ ... ],
    "notes": [ ... ],
    "activities": [ ... ],
    "stageGateChecks": [ ... ],
    "auditLogs": [ ... ]
  }
  ```

### 2.3 Reset Demo State
- **Endpoint**: `POST /api/state/reset`
- **Description**: Re-seeds the PostgreSQL database with pristine demo records from `initialData.js`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "CRM database state reset to demo seed data",
    "state": { ... }
  }
  ```

---

## 3. White-Label Branding & Settings

### 3.1 Update Branding Configuration
- **Endpoint**: `PUT /api/branding`
- **Description**: Updates application name, theme colors, logo, and recurrence intervals.
- **Request Body**:
  ```json
  {
    "appName": "Apex Sales CRM",
    "tagline": "B2B Enterprise Pipeline",
    "logoIcon": "Building2",
    "primaryColor": "#2563eb",
    "accentColor": "#10b981",
    "defaultRecurrenceDays": 60
  }
  ```
- **Response `200 OK`**: Updated `Branding` object.

---

## 4. Companies (Corporate Accounts)

### 4.1 List Companies
- **Endpoint**: `GET /api/companies`
- **Response `200 OK`**: Array of `Company` objects.

### 4.2 Create Company
- **Endpoint**: `POST /api/companies`
- **Request Body**:
  ```json
  {
    "name": "Apex Logistics Ltd",
    "industry": "Supply Chain & Logistics",
    "website": "https://apexlogistics.example",
    "address": "45 Industrial Corridor, Pune",
    "notes": "Key account for freight packaging"
  }
  ```
- **Response `201 Created`**: Saved `Company` object.

### 4.3 Update Company
- **Endpoint**: `PUT /api/companies/:id`
- **Request Body**: Partial company fields.
- **Response `200 OK`**: Updated `Company` object.

### 4.4 Delete Company
- **Endpoint**: `DELETE /api/companies/:id`
- **Response `200 OK`**: `{ "success": true }`

---

## 5. Contacts (Client Stakeholders)

### 5.1 List Contacts
- **Endpoint**: `GET /api/contacts`
- **Response `200 OK`**: Array of `Contact` objects.

### 5.2 Create Contact
- **Endpoint**: `POST /api/contacts`
- **Request Body**:
  ```json
  {
    "name": "Rajesh Sharma",
    "email": "rajesh@apexlogistics.example",
    "phone": "+91 98200 12345",
    "jobTitle": "Director of Procurement",
    "companyId": "comp-1",
    "companyName": "Apex Logistics Ltd",
    "ownerId": "u-3",
    "ownerName": "Marcus Vance"
  }
  ```
- **Response `201 Created`**: Saved `Contact` object.

### 5.3 Update Contact
- **Endpoint**: `PUT /api/contacts/:id`
- **Response `200 OK`**: Updated `Contact` object.

### 5.4 Delete Contact
- **Endpoint**: `DELETE /api/contacts/:id`
- **Response `200 OK`**: `{ "success": true }`

### 5.5 Bulk Import Contacts
- **Endpoint**: `POST /api/import/contacts`
- **Description**: Bulk inserts or updates an array of contacts with email/phone deduplication.
- **Request Body**:
  ```json
  {
    "contacts": [
      {
        "name": "Anita Rao",
        "email": "anita@example.com",
        "phone": "+91 98111 22233",
        "companyName": "Rao Packaging",
        "jobTitle": "Head of Operations"
      }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "createdCount": 1,
    "updatedCount": 0
  }
  ```

---

## 6. Leads Pipeline

### 6.1 List Leads
- **Endpoint**: `GET /api/leads`
- **Response `200 OK`**: Array of `Lead` objects ordered by creation date descending.

### 6.2 Create Lead
- **Endpoint**: `POST /api/leads`
- **Request Body**:
  ```json
  {
    "title": "Industrial Corrugated Boxes Inquiry",
    "contactName": "Sunil Verma",
    "contactEmail": "sunil@vermawarehousing.example",
    "contactPhone": "+91 98400 54321",
    "companyName": "Verma Warehousing",
    "source": "Google Inbound Search",
    "isOutbound": false,
    "status": "New",
    "ownerId": "u-3",
    "ownerName": "Marcus Vance"
  }
  ```
- **Response `201 Created`**: Saved `Lead` object.

### 6.3 Update Lead
- **Endpoint**: `PUT /api/leads/:id`
- **Response `200 OK`**: Updated `Lead` object.

### 6.4 Delete Lead
- **Endpoint**: `DELETE /api/leads/:id`
- **Response `200 OK`**: `{ "success": true }`

---

## 7. Deals Pipeline & Stage Transitions

### 7.1 List Deals
- **Endpoint**: `GET /api/deals`
- **Response `200 OK`**: Array of `Deal` objects.

### 7.2 Create Deal
- **Endpoint**: `POST /api/deals`
- **Request Body**:
  ```json
  {
    "title": "Q4 Corrugated Boxes Supply Contract",
    "value": 150000,
    "currency": "INR",
    "stageId": "stg-1",
    "stageName": "New Lead",
    "expectedCloseDate": "2026-10-31",
    "companyId": "comp-1",
    "companyName": "Apex Logistics Ltd",
    "contactId": "cnt-1",
    "contactName": "Rajesh Sharma",
    "ownerId": "u-3",
    "ownerName": "Marcus Vance",
    "isRecurring": true,
    "recurrenceDays": 60
  }
  ```
- **Response `201 Created`**: Saved `Deal` object.

### 7.3 Update Deal Properties
- **Endpoint**: `PUT /api/deals/:id`
- **Description**: Updates deal attributes, value changes (logs to `valueHistory`), or metadata.
- **Request Body**: Partial `Deal` fields.
- **Response `200 OK`**: Updated `Deal` object.

### 7.4 Transition Deal Stage (Governance Gate)
- **Endpoint**: `POST /api/deals/:id/stage-transition`
- **Description**: Initiates a stage advancement, admin override, or backward demotion.
- **Request Body**:
  ```json
  {
    "targetStageId": "stg-3",
    "targetStageName": "Sample Sent",
    "answers": {
      "decisionMakerConfirmed": true,
      "specsAgreed": true
    },
    "notes": "Client evaluated packaging durability positively",
    "demotionReason": null,
    "overrideReason": null,
    "user": {
      "id": "u-3",
      "name": "Marcus Vance",
      "role": "Sales Rep"
    }
  }
  ```
- **Behavior**:
  - **If User is Sales Rep**: Creates pending `StageGateCheck`, generates `[Stage Approval Required]` task for managers, marks deal as `Pending Review`.
  - **If User is Admin with `overrideReason`**: Directly executes stage move and logs `STAGE_OVERRIDE` audit entry.
  - **If Demotion (moving backward)**: Mandates `demotionReason`, moves deal backward, and logs `STAGE_DEMOTED`.

### 7.5 Route Deal to Closed Lost
- **Endpoint**: `POST /api/deals/:id/close-lost`
- **Request Body**:
  ```json
  {
    "lostReason": "Price / Budget",
    "lostReasonNote": "Competitor offered 15% discount on bulk order",
    "user": {
      "id": "u-3",
      "name": "Marcus Vance"
    }
  }
  ```
- **Response `200 OK`**: Deal updated to `Closed Lost` (`stg-8`) with terminal status `Lost`.

### 7.6 Create Rebuy / Repeat Order Deal
- **Endpoint**: `POST /api/deals/:id/create-rebuy`
- **Description**: Manually spawns a child repeat-purchase opportunity from a won deal.
- **Response `200 OK`**: Saved child `Deal` in `Buy Again (Renewal)` stage.

### 7.7 Automated Renewal Check
- **Endpoint**: `POST /api/deals/check-renewals`
- **Description**: Evaluates all won recurring contracts and generates rebuy opportunities whose renewal cycle has elapsed.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "checkedCount": 14,
    "createdCount": 2
  }
  ```

---

## 8. Tasks & Manager Approvals

### 8.1 List Tasks
- **Endpoint**: `GET /api/tasks`
- **Response `200 OK`**: Array of `Task` objects.

### 8.2 Create Task
- **Endpoint**: `POST /api/tasks`
- **Request Body**:
  ```json
  {
    "title": "Follow up on sample delivery",
    "dueDate": "2026-09-28",
    "type": "Call",
    "linkedType": "Deal",
    "linkedId": "dl-1",
    "linkedTitle": "Q4 Corrugated Boxes Supply Contract",
    "ownerId": "u-3",
    "ownerName": "Marcus Vance",
    "status": "pending"
  }
  ```
- **Response `201 Created`**: Saved `Task` object.

### 8.3 Update / Complete Task
- **Endpoint**: `PUT /api/tasks/:id`
- **Request Body**: `{ "status": "done" }` or updated fields.
- **Response `200 OK`**: Updated `Task` object.

---

## 9. Stage-Gate Checks & Approvals

### 9.1 List Stage-Gate Checks
- **Endpoint**: `GET /api/stage-gate-checks`
- **Response `200 OK`**: Array of `StageGateCheck` records.

### 9.2 Approve Stage-Gate Check
- **Endpoint**: `POST /api/stage-gate-checks/:id/approve`
- **Request Body**:
  ```json
  {
    "reviewer": {
      "id": "u-1",
      "name": "Alex Vance",
      "role": "Admin"
    }
  }
  ```
- **Response `200 OK`**:
  - Sets `StageGateCheck.status = 'approved_and_executed'`.
  - Promotes target deal to next pipeline stage.
  - Resolves corresponding approval tasks.
  - Logs `STAGE_APPROVED` audit event.

### 9.3 Reject Stage-Gate Check
- **Endpoint**: `POST /api/stage-gate-checks/:id/reject`
- **Request Body**:
  ```json
  {
    "note": "Missing economic buyer budget confirmation",
    "reviewer": {
      "id": "u-1",
      "name": "Alex Vance"
    }
  }
  ```
- **Response `200 OK`**:
  - Reverts deal status out of `Pending Review`.
  - Keeps deal in current stage.
  - Marks task resolution as `Rejected`.
  - Logs `APPROVAL_REJECTED` audit event.

---

## 10. Notes, Activities & Audit Logs

### 10.1 List & Create Notes
- **`GET /api/notes`**: Retrieve all internal notes.
- **`POST /api/notes`**:
  ```json
  {
    "text": "Client requested sample test report before next Tuesday",
    "linkedType": "Deal",
    "linkedId": "dl-1",
    "authorId": "u-3",
    "authorName": "Marcus Vance"
  }
  ```

### 10.2 List & Create Activities
- **`GET /api/activities`**: Retrieve chronological activity timeline.
- **`POST /api/activities`**:
  ```json
  {
    "type": "Call",
    "description": "Discussed volume discounts for 10,000 units with VP Procurement",
    "linkedType": "Deal",
    "linkedId": "dl-1",
    "linkedTitle": "Q4 Corrugated Boxes Supply Contract",
    "authorId": "u-3",
    "authorName": "Marcus Vance",
    "isOutbound": true
  }
  ```

### 10.3 Governance Audit Ledger
- **Endpoint**: `GET /api/audit-logs`
- **Description**: Returns immutable log of system actions, stage overrides, demotions, and approvals ordered by timestamp descending.
- **Response `200 OK`**: Array of `AuditLog` records.
