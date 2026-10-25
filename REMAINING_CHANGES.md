# Remaining CRM changes

Updated 2026-10-25. This file lists only work still open from the CRM review. Implemented changes are recorded in Git history; setup instructions are in [setup-guide.md](./setup-guide.md).

## 1. Finish workflow correctness

- [ ] Use one transactional stage-transition implementation for ordinary moves, approval decisions, demotions, closed-lost routing, and administrator overrides. Approval decisions are transactional, but ordinary transitions still have separate write and side-effect logic.
- [ ] Add concurrency and rollback tests for ordinary stage transitions and their follow-up tasks so retries cannot duplicate effects or leave a partially advanced deal.
- [ ] Replace remaining hard-coded default-stage IDs and name-based behavior in frontend metrics, checklists, and other workflow helpers with pipeline-aware stage codes and categories. Verify custom pipelines through won, lost, and renewal flows.
- [ ] Audit remaining permissive request schemas and create/update services for extra fields that could reach Prisma or produce a server error. Return useful 4xx responses for invalid business input.
- [ ] Run browser and database checks for the full qualification, approval, won, lost, backward-movement, and renewal paths, including failures on desktop and mobile.

## 2. Reconcile historical customer references

- [ ] Resolve seven archived references only when reliable records or audit history identify the correct target: one rebuy parent deal, three task links, and three activity links. Keep uncertain links in the reconciliation ledger rather than guessing.
- [ ] Inventory, back up, and reconcile any other existing database before applying its baseline or later migrations. Check for orphans, duplicate customers, and invalid ownership links there.

## 3. Activate and verify automation and integrations

- [ ] Configure a persistent worker or external schedule in the real deployment, set `CRON_SECRET`, and verify restart, crash, retry, competing-worker, and failure-status behavior there.
- [ ] Choose an email/calendar provider, configure credentials and user consent, then implement communication sync, deduplication, retries, and connection status.
- [ ] Create a private Supabase Storage bucket and configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and, if needed, `CRM_ATTACHMENTS_BUCKET` on the server. Verify real attachment upload, authorized download, deletion, and cleanup retries. The API and Files UI exist but cannot use Storage until configured.

## 4. Complete bounded client loading

- [ ] Replace the remaining unbounded initial loads of leads, deals, tasks, and activities, plus legacy full-list responses, with per-view cursor pagination, server-side search/filtering, and accurate counts. Reports and audit history already use server aggregation/pagination.
- [ ] Profile representative larger datasets and test page boundaries, visibility rules, and navigation after mutations.

## 5. Complete production security and account setup

- [ ] Diagnose and fix the public deployment's HTTP 500 responses on database-backed routes. Check deployment logs and hosted database connection settings after the password change; a passing `/api/health` does not check PostgreSQL.
- [ ] Provision an administrator password, set the real HTTPS `APP_ORIGIN`, add a gateway rate limit, and verify Secure cookies, sign-in, invitation acceptance, administrator-mediated recovery, and sign-out through the deployed reverse proxy.
- [ ] Confirm no other application needs Supabase's Data API, then disable it in the Supabase Dashboard and rerun Security Advisor. CRM tables already have RLS with client-role grants revoked; the no-policy INFO notices are intentional. The trigger-function search-path warnings were fixed.

After each remaining milestone, apply its versioned migrations where needed and run the relevant tests, lint, build, and browser checks. Record any deployment-only failures separately from local passes.
