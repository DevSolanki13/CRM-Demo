# CRM implementation progress

The detailed outstanding backlog is in [REMAINING_CHANGES.md](REMAINING_CHANGES.md).

## Temporary direct-access mode (2026-10-24)

- Login and sign-out are removed from the active UI and API routes. The server selects the first active administrator as a shared actor for every visitor, including production visitors. Account login and a landing page are deferred.
- The former authentication implementation remains in the repository for later restoration, but its routes are not mounted. This mode grants every reachable visitor administrator access; restrict the deployment and use disposable data until login returns.
- The current development database lacks `Company.ownerId` from the authentication migration and has a different recorded baseline name. The direct-access profile endpoint works, but the full CRM state cannot load against that database until its schema and migration history are safely reconciled. No database migration or reset was run for this mode change.

## Access control and initial correctness milestone

- Password login uses scrypt hashes, database-backed sessions, HttpOnly/SameSite cookies, eight-hour expiry, logout, and session revocation. An administrator provisions the first account; existing seeded users need passwords assigned before sign-in.
- The server supplies identity for transitions, approvals, activities, and audit writers. Admins manage staff and settings; managers review approvals and run renewal checks; sales reps see assigned records and linked companies. The application has one organization and no team or tenant model.
- State, list, and timeline responses are scoped to the signed-in user. Employee responses omit password hashes and sessions; client-supplied create/import IDs cannot overwrite records.
- Same-origin JSON writes and an in-process sign-in limit are enabled. Lead deletion preserves audit records.
- Initial correctness fixes covered Zod error responses, nonnegative deal amounts, zero values, partial updates, API error propagation, and the `completed` task status.
- The remote milestone verified 48 tests, 17 browser checks, build, and lint with five existing warnings in its isolated environment. Its baseline, authentication, and task-status migrations were applied to a separate empty database, and administrator provisioning and Secure cookies passed a production smoke check.

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
- A PostgreSQL 17 custom-format backup was saved to `.local-backups/before-section2-custom-fields-20261023.dump` (ignored by Git; SHA-256 `9D937042E8E025A2BF80CD5A24511D7222086F0E44DB978CF434C3AA820B9F91`). The local database was baselined and the additive lead/deal custom-fields migration was deployed without a seed or reset. The merge retains the remote baseline and authentication migrations plus the custom-fields and branding-default migrations. Existing databases need migration-history reconciliation before further migration deployment.
- Lead and deal custom fields now persist through create/update calls; rebuy opportunities inherit the parent's fields. Contact, lead, and deal custom fields share validation rules. Zero-valued deal amounts persist correctly.
- Rebuy creation waits for the latest won order's recurrence date, records the due date, locks the parent, reuses an active child, and retries transient serialization conflicts. Renewal checks surface failures.
- Approval, transition, close-lost, rebuy, note, activity, task, contact import, branding, stage, automation-setting, and staff request bodies now validate recognized inputs and return useful 400 responses. Invalid approval jumps are rejected. Client create/update errors are surfaced rather than reported as success.
- Browser and database checks cover qualification, approval, blocked movement during review, backward movement, Closed Won, Closed Lost, early renewal rejection, due renewal creation, repeated renewal, and custom-field round trips. The browser exercises the demotion, qualification, won, lost, and rebuy controls.

## Verification before merging the access-control milestone

- `npx prisma migrate status`: both migrations applied; database schema is up to date.
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: no difference.
- `npm test -- --run`: 12 files, 51 tests passed.
- `npm run test:e2e`: 15 Chromium tests passed.
- `npm run build`: passed with the existing frontend chunk-size warning.
- `npm run lint`: passed without warnings.

## Merge verification (2026-10-23)

- The access-control milestone and approval/workflow milestones were merged. Approval routes now take reviewer identity from the authenticated session and use the transactional approval executor.
- `npm run build`, `npm run lint`, `npx prisma validate --config prisma7.config.ts`, and 31 focused unit tests passed.
- The full database test run cannot pass against this checkout's existing database yet: it contains the Session 2 fields but lacks the newly merged authentication columns and Session table. The test run reported 44 passes and failures caused by that schema gap. Do not run migrations against an existing database until its migration history and schema are reconciled and backed up.
- The merge retains one remote baseline, then the custom-fields, authentication, task-status, and branding-default migrations. Existing databases need their recorded baseline names reconciled before applying pending migrations.

## Still open outside section 2

- Ordinary stage transitions and the approval executor still have separate transition implementations. The ordinary path needs a transactional compare-and-swap and shared side-effect logic.
- Lead-only gate checks need an explicit, persisted stage model. The current request creator requires a deal.
- Reviewer identity currently comes from the shared server-selected administrator. The approval executor also looks up that actor in the database before deciding.
- The reporting, customer-data, automation, product, scale, and deployment sections of the CRM backlog remain open.
