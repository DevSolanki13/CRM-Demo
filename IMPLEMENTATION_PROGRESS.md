# CRM reliability implementation

The detailed outstanding backlog is in [REMAINING_CHANGES.md](REMAINING_CHANGES.md).

## First release: access control and initial correctness fixes

Implemented:

- Password login with Node scrypt hashing, opaque database-backed sessions, HttpOnly/SameSite cookies, eight-hour expiry, logout, and session revocation on access/password changes. Raw session tokens are never stored in the database.
- Server-established identity for transitions, approvals, activities, and audit writers. The browser's demo identity selector is removed.
- A central, default-deny API resource policy. Admins manage employees, branding, stages, automation settings, and demo reset. Managers can review approvals and run renewal checks. Sales reps work with their assigned leads, deals, contacts, and tasks; linked companies are visible, and only their owner or a manager can change them. This application has one organization, with organization-wide manager access; it has no separate team/tenant model.
- Scoped state/list responses and timeline filtering. Employee directory responses contain public profile fields, never password hashes or sessions. User-supplied create/import IDs cannot overwrite existing records.
- Same-origin JSON writes and an in-process sign-in attempt limit. Multiple server replicas require a shared gateway rate limiter; there is no password recovery or MFA flow yet.
- Generic deal edits and initial deal creation cannot write arbitrary pipeline stages or terminal statuses. Frontend stage edits and gate submissions use the transition service.
- Correct Zod error responses, nonnegative deal amounts, valid zero amounts, and partial-update schemas that do not inject creation defaults into edits.
- API and approval errors propagate to callers rather than reporting success. Task completion uses `completed`, including a migration from legacy `done` records.
- Lead deletion preserves audit records. Remaining relationship/deletion rules are still pending.
- Versioned baseline, authentication, and task-status migrations. Existing seeded users have no login password until an administrator provisions one.

## Verification

Run against an isolated development/test database:

```sh
npm ci
npm run db:migrate
npx prisma generate --config prisma7.config.ts
npm run seed   # only for a new disposable demo database
npm test
npm run build
npm run lint
npm run test:e2e
```

For this cloud image, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. The browser fixture provisions temporary accounts and authenticates through the real API; it does not disable authentication. Tests create/mutate CRM records, so do not target production or a shared business database.

Verified in the current cloud environment: 48 tests passed, all 17 browser checks passed, the production build passed, and lint reported zero errors (five existing warnings). All three migrations were also applied successfully to a separate empty database; first-admin provisioning, repeat-bootstrap rejection, and the compiled production server's authenticated API and Secure cookie passed a smoke check. The temporary database and account were removed after verification.

See setup-guide.md for existing-database baselining and first-administrator creation.

## Next release: transaction-safe workflows

The complete review is not finished. Next, replace the remaining legacy approval executor with pending-only, stale-stage-aware, transactional decisions. Test competing approvals, retries, rollback after injected failures, and repeat-order side effects. Generic-update bypass protection does not solve approval concurrency by itself.

Subsequent work:

1. Stable stage semantics independent of display names; accurate historical lost-stage attribution, consistent report filters, renewal dates, and persisted lead/deal custom fields.
2. Data cleanup followed by foreign keys, deletion policies, durable audit history across every deletion path, and duplicate handling.
3. Scheduled automation with retry/duplicate prevention and operational failure visibility.
4. Pagination, targeted client refreshes, simpler labels, configurable approval exceptions and pipelines.
5. Attachments and connected email/calendar workflows, with provider choices and credentials configured when those integrations are implemented.
