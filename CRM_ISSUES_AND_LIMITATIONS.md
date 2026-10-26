# NexusCRM — Full Issue & Limitation Report

> **Historical audit (2026-10-20).** This report describes the code and deployment at the time of review. Several findings have since been addressed. For current implementation status and outstanding work, use [CHANGES_3_TO_8_PROGRESS.md](./CHANGES_3_TO_8_PROGRESS.md) and [IMPLEMENTATION_PLAN_3_TO_8.md](./IMPLEMENTATION_PLAN_3_TO_8.md).

Audit date: 2026-10-20
Scope: `backend/`, `frontend/`, `prisma/`, `e2e/`, `tests/`, plus the live deployment at `https://crm-phi-ruddy.vercel.app/`.
Method: dependency install, `eslint`, `vitest`, a local PostgreSQL instance to trace Prisma logic, live read-only checks against the deployed API, and manual code tracing of every service/component touched since the last review.

Every item below was **verified in the code or against the live deployment** — none of this is speculative.

---

## 1. Correctness bugs (highest priority)

### 1.1 `task.priority` is accepted, silently dropped, then read back as if it exists
- `backend/middleware/validation.js` → `taskSchema` accepts a `priority` field.
- `backend/services/taskService.js` → `createTask` reads `task.priority`, bakes it into the note text as `"[Priority: High] ..."`, then `sanitizeTaskData`'s allowlist (`VALID_TASK_KEYS`) strips `priority` before the value ever reaches Prisma — because the `Task` model in `prisma/schema.prisma` has **no `priority` column**.
- `backend/services/timelineService.js` later reads `task.priority` back out for its `metadata` — it is always `undefined`.
- **Confirmed live**: pulled real tasks from `https://crm-phi-ruddy.vercel.app/api/tasks` — every automated task has `"[Priority: High]"` as plain text inside `note`, and no `priority` field exists on the object at all.
- **Fix**: either add a real `priority` column to the `Task` model and migrate, or stop accepting/implying the field exists anywhere downstream.

### 1.2 `updateDeal` can crash with a 500 on an unexpected field
- `dealSchema` / `updateDealSchema` in `validation.js` use `.passthrough()`, so **any** extra key in a PUT body survives validation untouched.
- `dealService.updateDeal` spreads that body almost directly into `prisma.deal.update({ data: ... })`.
- Prisma throws `Unknown argument` for any key not in the `Deal` model, which is **not caught as a 400** — it falls through to the generic error middleware as an uncaught 500.
- Same `.passthrough()` pattern is used on multiple other schemas — worth auditing `updateContact`/`updateLead` for the same risk.
- **Fix**: use `.strip()` (zod's default) instead of `.passthrough()`, or scope arbitrary extra data to one explicit `customFields: z.record(z.any())` key.

### 1.3 No automatic seeding on a fresh/empty database
- `systemService.getState()` falls back to `|| []` for every table.
- On a brand-new Postgres database (first deploy, before anyone runs `npm run seed` or hits `/api/state/reset`), the entire CRM renders completely empty with zero indication why.
- **Fix**: seed-if-empty check on boot, or make the `npm run seed` step unmissable in the README/setup guide.

### 1.4 Deals cannot be deleted from the UI (dead prop)
- `onDeleteDeal` is passed from `App.jsx` into `PipelineView.jsx` as a prop, but it is **never called anywhere inside `PipelineView.jsx`**.
- The backend fully supports `DELETE /api/deals/:id`; there is simply no button or menu item wired to it. Deals, once created, are permanent in the UI (short of manually transitioning to Closed Lost).

### 1.5 CSV *Import* feature has regressed to export-only, with dead code left behind
- `frontend/components/ImportExportModal.jsx` is titled **"CSV Data Export Center"** and only offers three export buttons (Contacts, Leads, Deals). There is no `<input type="file">`, no column-mapping UI, nothing to actually import a CSV.
- Meanwhile: the backend route `POST /api/import/contacts`, the service `contactService.importContacts`, the client function `importContacts()` in `crmClient.js`, and a `handleImportContacts` handler in `App.jsx` **all still exist** — but `handleImportContacts` is never passed to `ImportExportModal` or any other component. It's dead code.
- This matters because CSV import was one of the originally stated core requirements for this project. It currently does not exist as a user-facing feature, despite the plumbing being there.

---

## 2. Inconsistent / risky destructive actions (UX)

- **Company delete** (`CompaniesView.jsx`) and **Contact delete** (`ContactsView.jsx`) and **Task delete** (`TasksView.jsx`, both instances) fire **immediately on click** — no confirmation of any kind. One misclick permanently deletes a company, contact, or task.
- **Bulk lead delete** (`LeadsView.jsx`) is the *only* delete path that confirms — and it uses a native `window.confirm()`, which is a jarring browser-chrome dialog that breaks out of the app's otherwise fully custom design language (it's the only native browser dialog anywhere in the app).
- Net effect: delete behavior is inconsistent across modules, and the two riskiest, most common single-record deletes (company, contact) have no safety net at all.
- **Fix**: pick one consistent, in-app confirmation pattern (a small modal, not `window.confirm`) and apply it uniformly to every destructive action.

---

## 3. Accessibility / keyboard handling

- Only **3 of 13** components that render a modal or dialog-style overlay (`DashboardView.jsx`, `DetailDrawer.jsx`, `GlobalSearchModal.jsx`) handle the `Escape` key. The other 10 — including `AddActivityModal`, `StageGateCheckModal`, `ImportExportModal`, `LeadJourneyView`, `EmployeesView`, `TasksView`, `PipelineView`, `CompaniesView`, `ContactsView`, `LeadsView` — cannot be closed with Escape, and have no visible focus trap.
- `Header.jsx`'s dropdowns (Quick Add, user switcher) close via `onMouseLeave` — this does not fire on touch devices at all, meaning on mobile these menus can only be dismissed by tapping elsewhere (not obviously discoverable), and on desktop it can close unexpectedly while moving the mouse diagonally toward an item.
- Good news: where ARIA *is* used (`Header.jsx`, the mobile nav, `Sidebar.jsx`) it's done properly — `aria-label`, `aria-expanded`, `aria-haspopup`, `role="menu"`/`role="menuitem"`, `focus-visible` outlines. The problem is coverage, not technique — it wasn't applied consistently across the whole app.

---

## 4. Empty / loading states

- Only **2 of ~18** view components (`GlobalSearchModal.jsx`, `LeadsView.jsx`) have an explicit "no results" / empty-state message.
- Only **3 files** reference any loading indicator (`Loader2`, `isLoading`) at all. Companies, Contacts, Tasks, Pipeline, and Reports views give no feedback while a create/update/delete request is in flight, and show nothing but a bare, headerless table if the underlying list happens to be empty (e.g. a brand-new account, or after the "no auto-seed" issue in §1.3 above).
- This will read as "broken" or "frozen" to a first-time user far more often than it will read as "fine, just empty."

---

## 5. Validation coverage gaps (backend)

- Of 27 write (`POST`/`PUT`) routes in `crmRoutes.js`, only **12** have a `validateBody(...)` schema attached: companies, contacts, leads, deals, tasks, and the deal-transition endpoint.
- **Unvalidated:** stages, users, notes, activities, stage-gate-check create/approve/reject, branding update, CSV import. Any malformed payload to these routes goes straight to the service layer and Prisma, with whatever error Prisma throws surfacing as a raw 500.

---

## 6. Environment / deployment limitations (not code defects, but worth knowing)

- **Prisma engine binaries are fetched from `binaries.prisma.sh` at `prisma generate` / `prisma migrate` time.** In network-restricted environments (this review's sandbox is one example), that download is blocked and the project cannot be built or migrated at all until it's run somewhere with normal internet access. This is standard Prisma behavior, not a bug in your code, but it's worth knowing if you ever deploy to a locked-down CI runner or offline environment.
- No `engineType = "client"` is set in the `generator client` block of `prisma/schema.prisma` — setting this (available in Prisma 7 with driver adapters, which this project already uses via `@prisma/adapter-pg`) removes the need for the schema/query engine binary entirely at runtime, which would reduce the project's exposure to the issue above.
- The project has **no authentication or authorization layer** — expected and already acknowledged for a demo build, but worth restating here: the "RBAC switcher" in the header is a pure demo convenience (anyone can click into any role), not real access control. Don't treat it as a security boundary if this goes anywhere near real customer data.

---

## 7. Minor / low-priority

- `exportToCSV()` in `crmHelpers.js` never calls `URL.revokeObjectURL(url)` after the download — a small memory leak on repeated exports in a single session. CSV quote/comma escaping itself is implemented correctly.
- 9 ESLint warnings (unused variables/imports) across `dealService.js`, `leadService.js`, and two test files — harmless, but easy to clean up (`no-unused-vars` is already configured to allow an `_`-prefixed escape hatch if intentional).
- `LeadJourneyView.jsx` is now 1,590 lines — the single largest file in the project, and the "god component" problem flagged in earlier review rounds has grown rather than shrunk in absolute terms.

---

## What's genuinely good (so this doesn't read as all-negative)

- Lint is clean (0 errors), there's a real Vitest unit suite and a well-written Playwright e2e suite whose assertions I cross-checked against actual seed data (they're not boilerplate).
- The follow-up automation engine is real and **confirmed firing in production** (verified via the live `/api/audit-logs` endpoint).
- Mobile UX has had real, specific thought put into it: a dedicated bottom nav, a swipeable mobile Kanban/bar-chart view, a mobile drawer for secondary nav — not just a squeezed-down desktop layout.
- Where accessibility attributes exist, they're implemented correctly (not just aria-label soup) — the issue is coverage, not competence.
- The live deployment works, is seeded with real data, and shows evidence of real usage beyond the seed set.

---

## Suggested fix order

1. `task.priority` round-trip (§1.1) — pick a direction and make it consistent.
2. `updateDeal` passthrough → Prisma crash risk (§1.2) — same pattern may exist on other update routes, audit all of them.
3. Pick one destructive-action confirmation pattern and apply it everywhere (§2) — this is the highest-visibility fix for how "finished" the app feels.
4. Decide whether CSV import is in scope — either build the missing UI or remove the dead plumbing (§1.5).
5. Add empty/loading states to the remaining ~15 views (§4).
6. Fill in the missing 15 validation schemas (§5).
7. Add Escape-key handling + basic focus trap to the remaining 10 modal components (§3).
8. Split `LeadJourneyView.jsx` into subcomponents.
