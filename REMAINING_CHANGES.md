# Remaining CRM changes

This is the remaining work from the supplied CRM project review. The first implementation milestone is complete; this file is a backlog, not a claim that the full review has been implemented. See [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) for completed changes and verification, and [setup-guide.md](setup-guide.md) for setup and account creation.

## 1. Next priority: reliable approval execution

Generic deal edits and creation now reject pipeline bypasses, and identity comes from the server. The legacy approval executor still needs the following changes:

- [ ] Require an existing approval request that is still pending for both approval and rejection. Remove fallback logic that synthesizes or silently succeeds without a valid request.
- [ ] Verify that the deal is still in the stage recorded when the request was submitted; reject stale decisions with a clear conflict response.
- [ ] Make approval status, deal/lead updates, approval-task resolution, activity history, and audit entries one database transaction.
- [ ] Add concurrency protection so two reviewers cannot execute the same request twice or overwrite newer pipeline progress.
- [ ] Make repeated submissions, retries, and side effects safe against duplicates, including follow-up tasks and rebuy generation.
- [ ] Use one authoritative transition implementation for ordinary movement, gate decisions, demotions, lost routing, and admin overrides. The legacy approval executor still has duplicated transition writes.
- [ ] Prevent direct approval-task edits from replacing a real approval/rejection decision.
- [ ] Add database-backed tests for competing decisions, stale requests, repeated execution, rollback after an intermediate failure, and exactly-once side effects.

## 2. Workflow and data correctness

- [ ] Give stages stable business identifiers/codes independent of editable display names; remove name-based transition and automation rules in backend and frontend.
- [ ] Keep stage labels on existing records and historical snapshots consistent when a stage is renamed, while preserving meaningful historical context.
- [ ] Persist lead and deal custom fields in the database and stop discarding them in create/update services. Validate them consistently with contact custom fields.
- [ ] Fix renewal eligibility: create repeat-order opportunities according to the actual recurrence date rather than merely because a previous child deal does not exist.
- [ ] Preserve an explicit next-renewal/due date if early opportunity creation is intentional; prevent duplicate active rebuy opportunities under concurrent requests.
- [ ] Finish consistent validation across endpoints that still accept loosely structured bodies, including approval input, notes, activities, imports, and settings. Return useful client errors for invalid business operations.
- [ ] Exercise the complete qualification, closed-won, closed-lost, backward-movement, and renewal workflows through the browser and database, including failure paths.

Already fixed: validation-handler crashes, the zero-value money fallback, negative API deal amounts, false client approval success, inconsistent `done`/`completed` task status, and creation defaults resetting omitted fields during partial updates.

## 3. Accurate reporting

- [ ] Record the stage where a deal was lost before moving it to Closed Lost, and use that field in the lost-by-stage report.
- [ ] Backfill historical lost-stage information only from trustworthy audit/history evidence. Display **Unknown** when it cannot be recovered.
- [ ] Apply the selected sales-rep filter consistently to renewal, rebuy, revenue, account, and other report calculations.
- [ ] Add report regression tests using multiple reps, closed deals, recurring deals, and multiple accounts so mixed scopes are detected.
- [ ] Add configurable forecast probabilities and forecast/target management after record integrity and report accuracy are established.

## 4. Customer records and audit integrity

- [ ] Inventory and clean existing orphan IDs, invalid references, empty-string foreign keys, and duplicate records before adding constraints.
- [ ] Add Prisma relations, database foreign keys, and useful indexes for company/contact/lead/deal ownership and business links. Session-to-user is already a real relation.
- [ ] Define explicit restrict, archive, nullify, or cascade behavior for each deletion path; prevent accidental loss of customer history.
- [ ] Preserve durable audit history across every deletion/reset path and restrict history mutation. Lead deletion now preserves audit rows, but this does not complete the wider deletion policy.
- [ ] Add duplicate detection and a controlled contact/customer merge workflow that preserves related deals, tasks, notes, and history.
- [ ] Test deletion and merge behavior with real related data and failed operations.

## 5. Dependable automation

- [ ] Introduce a background scheduler for renewal checks and time-based follow-ups; the current renewal trigger is manual.
- [ ] Add persisted job/run state, retries, duplicate prevention, and visible failed-job status.
- [ ] Replace logged-and-swallowed follow-up failures with a recoverable process.
- [ ] Verify behavior when the application restarts, a worker crashes, a job is retried, or multiple workers run simultaneously.

## 6. Daily usefulness and product configuration

- [ ] Add email/calendar connections and communication logging to reduce duplicate manual entry. Select providers and configure required credentials when implementing these integrations.
- [ ] Add attachment storage, record links, authorized upload/download access, and deletion/retention behavior.
- [ ] Make manager approvals configurable around meaningful exceptions, such as discounts, large deals, and missing requirements, rather than requiring review for every rep advancement.
- [ ] Support multiple independent pipelines with pipeline-specific stages, qualification requirements, and reporting.
- [ ] Simplify technical and governance-heavy labels to ordinary sales language, and verify the rendered desktop/mobile workflows.

## 7. Scale and client state

- [ ] Replace unbounded full-state loading with paginated, scoped endpoints for records, tasks, activities, and audit history.
- [ ] Move record visibility filtering into targeted database queries. The initial access policy currently filters a complete server-loaded CRM snapshot.
- [ ] Refresh or invalidate only affected client collections after mutations rather than reloading all CRM data.
- [ ] Profile representative larger datasets and add tests for pagination, filtering, and access boundaries.
- [ ] Split the large frontend bundle where useful; the production build currently reports a chunk-size warning.
- [ ] Resolve the five existing lint warnings.

## 8. Account lifecycle and deployment follow-through

- [ ] Add a supported password recovery/account invitation flow; currently administrators set/reset staff passwords and the first administrator is provisioned through a local command.
- [ ] Use a shared gateway sign-in rate limiter before deploying multiple application replicas. The current limiter is process-local.
- [ ] Configure the actual deployment's HTTPS origin (`APP_ORIGIN`) and verify Secure cookie/session behavior through its reverse proxy. Local production-bundle smoke checks already passed.
- [ ] Back up and reconcile each existing database before adopting the baseline migration; do not mark a mismatched schema as migrated or seed business data.
- [ ] Re-run migrations, the full test suite, production build, lint, and relevant browser checks for each implemented milestone. Record unresolved failures separately from passes.

## Deferred feature roadmap

The repository's older roadmap also proposes lead scoring, deal health, next-best-action suggestions, AI summaries, proposal/quote management, and richer dashboards. Those are follow-on product features; they should not displace the security, integrity, correctness, and automation work above.
