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

This document provides a complete specification of all REST API endpoints provided by the Sales CRM backend server.

---

## 1. Global Standards

- **Base URL**: `/api`
- **Request & Response Content-Type**: `application/json`
- **Validation**: Mutating requests pass through **Zod** schema middleware (`validation.js`).
- **Standard Error Payload**:
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

## 2. Health & System State

### 2.1 Server Health Check
- **`GET /api/health`**
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "uptime": 1420.5,
    "timestamp": "2026-10-20T03:00:00.000Z"
  }
  ```

### 2.2 Hydrate Full CRM State
- **`GET /api/state`**
- **Description**: Single-request hydration returning branding, users, stages, companies, contacts, leads, deals, tasks, notes, activities, stage gate checks, and audit logs.

### 2.3 Reset Demo State
- **`POST /api/state/reset`**
- **Description**: Re-seeds PostgreSQL with pristine demo records from `initialData.js`.

---

## 3. Leads Pipeline

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/leads` | List all leads ordered by creation date descending |
| `POST` | `/api/leads` | Create a new lead (Zod validated) |
| `PUT` | `/api/leads/:id` | Update lead fields |
| `DELETE` | `/api/leads/:id` | Delete lead |

### Lead Creation Payload (`POST /api/leads`):
```json
{
  "title": "Industrial Corrugated Boxes Inquiry",
  "contactName": "Sunil Verma",
  "contactEmail": "sunil@vermawarehousing.example",
  "contactPhone": "+91 98400 54321",
  "companyName": "Verma Warehousing",
  "source": "Web Inbound",
  "isOutbound": false,
  "status": "New",
  "ownerId": "u-3",
  "ownerName": "Marcus Vance"
}
```

---

## 4. Deals Pipeline & Stage Transitions

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/deals` | List all active deals |
| `POST` | `/api/deals` | Create a new deal (Zod validated) |
| `PUT` | `/api/deals/:id` | Update deal fields & log value revisions |
| `DELETE` | `/api/deals/:id` | Delete deal |
| `POST` | `/api/deals/:id/stage-transition` | Transition stage with gate validation |
| `POST` | `/api/deals/:id/close-lost` | Mark opportunity Closed Lost with reason |
| `POST` | `/api/deals/:id/create-rebuy` | Spawn child repeat purchase deal |
| `POST` | `/api/deals/check-renewals` | Trigger background renewal evaluation |

### Stage Transition Payload (`POST /api/deals/:id/stage-transition`):
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

### Route to Closed Lost (`POST /api/deals/:id/close-lost`):
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

---

## 5. Unified Customer Activity Timeline

### 5.1 Query Timeline Stream
- **`GET /api/timeline`**
- **Query Parameters**:
  - `linkedId` (optional): Filter to a specific deal or lead ID
  - `linkedType` (optional): `"Deal"` or `"Lead"`
  - `limit` (optional, default: `50`): Maximum entries to return
- **Response `200 OK`**: Chronologically sorted list aggregating activities, gate checks, notes, and audit events.
  ```json
  [
    {
      "id": "act-1",
      "source": "activity",
      "type": "Call",
      "title": "Outbound Discovery Call",
      "description": "Discussed initial delivery timelines and sample requirements",
      "timestamp": "2026-10-18T10:30:00.000Z",
      "authorName": "Marcus Vance",
      "stageName": "Contacted",
      "isOutbound": true
    }
  ]
  ```

---

## 6. Activities & Notes

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/activities` | List chronological activity records |
| `POST` | `/api/activities` | Log call, meeting, email, or interaction |
| `DELETE` | `/api/activities/:id` | Remove activity entry |
| `GET` | `/api/notes` | List internal qualitative notes |
| `POST` | `/api/notes` | Create an internal note |

### Create Activity Payload (`POST /api/activities`):
```json
{
  "type": "Call",
  "description": "Discussed bulk order terms with VP Procurement",
  "linkedType": "Deal",
  "linkedId": "dl-1",
  "linkedTitle": "Corrugated Boxes Supply Contract",
  "authorId": "u-3",
  "authorName": "Marcus Vance",
  "stageId": "stg-5",
  "stageName": "Negotiation",
  "isOutbound": true
}
```

---

## 7. Tasks & Stage Gate Approvals

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/tasks` | List tasks & approval agenda items |
| `POST` | `/api/tasks` | Create task (Zod validated) |
| `PUT` | `/api/tasks/:id` | Update task or mark done |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `GET` | `/api/stage-gate-checks` | List stage gate qualification checks |
| `POST` | `/api/stage-gate-checks` | Submit qualification gate check |
| `POST` | `/api/stage-gate-checks/:id/approve` | Approve stage advancement & execute move |
| `POST` | `/api/stage-gate-checks/:id/reject` | Reject stage advancement with feedback |

### Approve Stage Gate (`POST /api/stage-gate-checks/:id/approve`):
```json
{
  "reviewer": {
    "id": "u-1",
    "name": "Alex Vance",
    "role": "Admin"
  }
}
```

---

## 8. Accounts & Contacts

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` / `POST` | `/api/companies` | List companies / Create corporate account |
| `PUT` / `DELETE` | `/api/companies/:id` | Update / Delete corporate account |
| `GET` / `POST` | `/api/contacts` | List contacts / Create stakeholder contact |
| `PUT` / `DELETE` | `/api/contacts/:id` | Update / Delete contact |
| `POST` | `/api/import/contacts` | Bulk import contacts with deduplication |

---

## 9. Stages, Users, Branding & Settings

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` / `POST` | `/api/stages` | List / Create pipeline stages |
| `PUT` | `/api/stages/:id` | Update stage name, order, or color |
| `GET` / `POST` | `/api/users` | List / Create team staff members |
| `PUT` | `/api/users/:id` | Update staff profile & RBAC role |
| `PUT` | `/api/branding` | Update white-label branding & renewal days |
| `GET` / `PUT` | `/api/settings/automation-rules` | Fetch / Update automated follow-up rules |
| `GET` | `/api/audit-logs` | Retrieve immutable governance audit trail |
