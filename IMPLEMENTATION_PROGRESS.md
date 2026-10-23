# CRM implementation progress

## Approval execution milestone (2026-10-23)

- Approval and rejection require a saved, pending request identified by request ID. Missing, repeated, and stale decisions return 404 or 409.
- Request creation and decision execution use PostgreSQL transactions. Decisions lock the request and deal, and update the deal, linked lead, approval tasks, activity, audit entry, and generated follow-up tasks together.
- Generated approval and follow-up task IDs are tied to the request. Direct approval-task creation, editing, and deletion through the generic task service are rejected.
- The client sends real request IDs and shows API errors instead of reporting success after failure.
- Generic deal updates reject changes to managed pipeline state; new deals start in the first stage. Stage transitions reject deals with pending approvals.
- Added database-backed tests for missing and stale requests, competing decisions, repeated execution, rollback, follow-up task duplication, and task-edit bypasses.
- Removed the commented legacy stage-gate executor; the service delegates requests and decisions to the transactional approval executor.

## Workflow and data correctness: section 2 (2026-10-23)

- Stage rules and qualification criteria use stable IDs. Each API stage also has a stable business code derived from its ID; editable names do not control transitions or automation.
- Renaming a stage updates current deal labels, pending checks, and their approval tasks in one transaction. Audit and activity labels remain historical snapshots. New transition audit entries include stage IDs so timeline grouping survives later renames.
- A PostgreSQL 17 custom-format backup was saved to `.local-backups/before-section2-custom-fields-20261023.dump` (ignored by Git; SHA-256 `9D937042E8E025A2BF80CD5A24511D7222086F0E44DB978CF434C3AA820B9F91`). Prisma's read-only diff found only a branding default mismatch; the schema was aligned, then the diff was empty. The matching baseline was marked applied and the additive lead/deal custom-fields migration was deployed. No seed or reset was run.
- Lead and deal custom fields now persist through create/update calls; rebuy opportunities inherit the parent's fields. Contact, lead, and deal custom fields share validation rules. Zero-valued deal amounts persist correctly.
- Rebuy creation waits for the latest won order's recurrence date, records the due date, locks the parent, reuses an active child, and retries transient serialization conflicts. Renewal checks surface failures.
- Approval, transition, close-lost, rebuy, note, activity, task, contact import, branding, stage, automation-setting, and staff request bodies now validate recognized inputs and return useful 400 responses. Invalid approval jumps are rejected. Client create/update errors are surfaced rather than reported as success.
- Browser and database checks cover qualification, approval, blocked movement during review, backward movement, Closed Won, Closed Lost, early renewal rejection, due renewal creation, repeated renewal, and custom-field round trips. The browser exercises the demotion, qualification, won, lost, and rebuy controls.

## Verification

- `npx prisma migrate status`: both migrations applied; database schema is up to date.
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: no difference.
- `npm test -- --run`: 12 files, 51 tests passed.
- `npm run test:e2e`: 15 Chromium tests passed.
- `npm run build`: passed with the existing frontend chunk-size warning.
- `npm run lint`: passed without warnings.

## Still open outside section 2

- Ordinary stage transitions and the approval executor still have separate transition implementations. The ordinary path needs a transactional compare-and-swap and shared side-effect logic.
- Lead-only gate checks need an explicit, persisted stage model. The current request creator requires a deal.
- The API still accepts reviewer IDs from request bodies. Looking up the ID and role in the database prevents unknown/non-manager decisions, but authenticated server identity is absent from this checkout.
- The reporting, customer-data, automation, product, scale, and deployment sections of the CRM backlog remain open.
