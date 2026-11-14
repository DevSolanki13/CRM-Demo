# Recurring leads: setup and testing

## Where to find it

Open **Leads → Recurring Leads** or go directly to `/leads/recurring`. New leads are available at `/leads/new`.

The desktop table shows **Lead name, Email / phone, Status, Assigned employee, Recurrence date, Next recurrence, Next follow-up, Last contacted, Actions**. When present, the company name appears below the lead name in smaller muted text. Recurrence date is the schedule's anchor; Next recurrence is the current expected purchase date. The repeat pattern appears below the recurrence date, with monthly-review and overdue indicators alongside the relevant fields. Company names remain searchable and are included as a separate **Company** field in the leads CSV export.

Use the row actions:

- **Pencil:** edit the lead, assigned employee, and future repeat schedule (administrator).
- **Complete follow-up:** open the required cycle outcome form when a follow-up is assigned to you. Managers can open it to view; only the assigned rep can submit.
- **Arrows:** open **Update cycle**, including confirmation, notes, follow-up dates, monthly review, cycle history, and manager pause/resume controls. For a paused schedule this opens **View cycle**.
- **Trash:** request deletion (administrator), with confirmation. Records with linked data or cycle history remain protected; pause those schedules instead.
- **Lead name:** open the lead details. Email and phone links open your mail or calling app.

The desktop page scrolls vertically through the current page of rows; scroll the table sideways on narrower screens to reach every column. Phones use cards with the same lead-name/company hierarchy and cycle and schedule actions. All recurring-view filters remain above the table.

The verification preview runs at **http://localhost:3011/leads/recurring**. If you use your original server on port 3000, restart that server to load the new backend routes. Refreshing the browser alone does not restart the backend.

The additive recurring-follow-up migration has been applied to the confirmed development database. It adds user time zones and workspace follow-up settings, numbers recurrence cycles, soft-archives leads, and creates `RecurringLeadFollowUp`, append-only `LeadHistory`, and `UserNotification` tables. It preserves existing lead data and backfills cycle numbers. Before deploying to another environment, confirm the target database, check migration status, and apply pending migrations:

```sh
npx prisma migrate status --config prisma7.config.ts
npm run db:migrate
npm run build
```

## Set up a lead

An administrator can choose **Add Recurring Lead**, enter its name, select **Assigned Owner**, and set the **Expected first purchase date**.

| Customer's pattern | Choose |
| --- | --- |
| Once a month | Every number of months → 1 |
| Once every four or five months | Every number of months → 4 or 5 |
| Every week | Every number of weeks → 1 |
| Three times per calendar month | Selected dates each month → for example, 5, 15, 25 |
| Four times per calendar month | Selected dates each month → for example, 1, 8, 15, 22 |
| Every fixed number of days | Every number of days |

Weekly and four times per calendar month are different schedules. Selected dates beyond a short month's end use that month's last day. Monthly intervals retain their anchor day: a January 31 monthly schedule can use February 28 and then March 31.

**Import Companies** now lets an administrator choose the starting date, repeat pattern, and responsible rep for the workbook. Unassigned imports are allowed, but must be assigned before a rep can see them or receive reminder tasks. Existing imported records are currently unassigned; choose their owners rather than assuming ownership from the company name.

Use the edit icon to assign an existing lead or change its future schedule. **Future schedule anchor date** controls future occurrences; editing settings does not overwrite an unresolved current purchase date. To correct or postpone the current purchase date, use **Update cycle → Rescheduled / postponed**. This preserves the original date and records who changed it and why.

## What the rep does

1. Open **Recurring Leads** and choose **Complete follow-up**, or open the assigned **Follow-up** task in **Tasks**. For cycles without a dedicated follow-up record, use **Update cycle**.
2. Select an outcome and write a note of at least five characters explaining the result.
3. For an unresolved cycle, choose the next follow-up date, today or later.
4. Save the update. This also satisfies the current month's lead review.

| Outcome | Result |
| --- | --- |
| Contact attempted | Keeps the cycle open; requires another follow-up |
| Awaiting response | Keeps the cycle open; requires another follow-up |
| Purchase confirmed | Keeps the cycle open until the actual purchase is recorded |
| Rescheduled / postponed | Changes this cycle's expected date with a reason; keeps its original date in history |
| Not buying this cycle | Closes this cycle and schedules the next future occurrence |
| Purchase received | Requires a won deal linked to this lead; closes the cycle and schedules the next future occurrence |

Create and manage deals through the lead's normal details/journey or Pipeline. A won deal cannot be counted as the received purchase for two different cycles. Call/email/meeting logging maintains the existing Last Contacted field; a monthly review alone does not pretend that a call occurred.

Past dates remain overdue until someone records an outcome or deliberately reschedules. Reading or refreshing the list never rolls dates forward. When an old cycle is explicitly closed, the next cycle uses the next future date in the agreed schedule, rather than creating a backlog of empty historical cycles.

## Reminders and monthly accountability

- Normal monthly and longer cycles create reminder tasks **10 days before**, then **5 days before** if the purchase is still unconfirmed.
- Frequent schedules use shorter offsets, shown in the schedule form. A weekly schedule uses **3 days and 1 day**.
- When the expected purchase date arrives, the required cycle follow-up is created; its default deadline is two days later. The older 10-/5-day reminders are cancelled or skipped at that point so they do not appear as stale overdue work.
- Each assigned active lead also gets a monthly review task, due on the last day of the month. This includes customers whose purchases are several months apart.
- A meaningful cycle update or submitted follow-up completes outstanding monthly review tasks. It does not automatically close an unresolved purchase cycle.
- A missed reminder is overdue even if the expected purchase is still in the future.
- Recurring reminder tasks require **Update cycle**; follow-up tasks open the required deal outcome form. Ordinary task completion/deletion cannot bypass required fields.
- Repeated automation runs do not duplicate reminders. Reassigning a lead transfers pending recurring tasks to its new owner and removes the old rep's access to the lead.

Reminders appear inside the CRM in **Tasks** and the dashboard. During local development, `npm run dev` starts both the app and its automation worker. It runs one check at startup and then checks every minute; no separate worker terminal is needed. `npm run worker` remains available when you want to run the scheduler without the web app.

```sh
npm run dev
```

To run the existing automation once (this processes all due work in the configured database):

```sh
npm run automation:once
```

Those commands also run the CRM's other existing automation jobs. Vercel does not run the local process timer; the cron entry in `vercel.json` invokes `/api/internal/automation/run` daily at 00:00 UTC instead. Set `CRON_SECRET` to a random value of at least 32 characters in the Vercel project environment; Vercel sends it to the protected route. The configured daily cadence works on Hobby. Pro and Enterprise can use a more frequent schedule if the project needs faster-than-daily reminders. Vercel schedules run for production deployments, not local `npm run dev`.

Before deploying, set the production database/environment variables and apply pending migrations to that database with `npm run db:migrate`. The migration already applied to the confirmed development database does not automatically update Vercel's production database.

Each automation run creates one follow-up task for each due or completed cycle. Locally this runs every minute; the current Vercel configuration runs daily. Its due date defaults to two days after the cycle end (configurable in **Settings → Branding**). Reminders start on the due date and repeat at the configured interval; after the escalation threshold, all active managers and administrators are notified. Due dates use the assigned employee's IANA time zone, editable in **Team & Workload → Edit Team Member**. Notifications are in-app; no outbound email sender is configured.

Open a task titled **Follow-up: [Lead Name] - [Company] - Cycle [N]**, or click **Complete follow-up** on its lead row, to complete the required form. The assignee sees the task in **My Tasks**; managers can find it through **Team View**. The cycle date triggers task creation, and the task deadline defaults to two days later (configurable in **Settings → Branding**). A completed deal records value and completion date, then advances the recurring schedule. An uncompleted deal requires an update, current status, and next follow-up date; Lost also requires a lost reason and pauses the schedule. An active follow-up form must be submitted before the older cycle editor can update that cycle. History is append-only, newest first, filterable by cycle/outcome, and exportable as CSV. Managers can archive a recurring lead; pending tasks are cancelled while its history is retained.

## What the manager sees

Filter by **Responsible rep**, then use **Overdue**, **Due today**, **Next 10 days**, **Overdue Follow-ups**, **Awaiting confirmation**, **Missing monthly update**, or **Unassigned**.

**Missing monthly update** means there is no recorded cycle update in this calendar month. It appears throughout the month as an action needed; the monthly review task becomes overdue after its month-end deadline.

Administrators and managers can pause/resume a schedule with a reason through **Update cycle → Manager controls**. Pausing suspends future reminder generation and monthly review requirements. Existing tasks, overdue dates, and history remain visible. Resuming retains the unresolved cycle.

Cycle history shows the latest 24 cycles and 30 updates. The complete update history remains in lead activities and the audit trail. Records with cycle history are protected from deletion; pause a discontinued schedule to retain its history.

## Quick manual test

1. As an administrator, create a lead named **Recurring test**, assign a rep, choose monthly repetition, and set its first purchase **10 days from today**.
2. Switch to that rep's account. Confirm the lead appears under **Recurring Leads**; another rep should not see it.
3. Open **Tasks**. The first reminder and monthly review task should exist. Choose **Update cycle**.
4. Save **Awaiting response**, a useful note, and a follow-up for tomorrow. Confirm the expected purchase date stays the same, the monthly review changes to **Reviewed**, and history contains the note.
5. As a manager/admin, select **Missing monthly update**. That lead should no longer appear in the current month.
6. Create another test lead with its first purchase **5 days from today**. Both reminder thresholds have been reached, so both reminders should exist. Running automation again should not duplicate them.
7. Create a test lead with an expected purchase yesterday. Confirm it stays in **Overdue** after refreshing the page. Also test a future purchase with a follow-up yesterday; that should be overdue too.
8. Test **Rescheduled / postponed** with a new date and a reason. The current date changes and the original remains in history.
9. Test **Purchase confirmed**. It must remain open. To record **Purchase received**, choose a linked won deal. The next cycle should then appear.
10. Test pause/resume as a manager, including a reason. A sales rep should not have those controls.
11. Try a schedule with selected monthly dates and check the mobile layout.
12. Run `npm run automation:once` for a due or completed cycle. Confirm one follow-up task and in-app notification are created, then run it again and verify no duplicate appears.
13. Submit a completed follow-up and a not-completed follow-up. Verify required fields block invalid submissions, Lost requires a reason, and the lead's History tab records each event and exports it to CSV.
14. Change the assignee time zone, reassign a pending follow-up, and verify its owner, due date, history, and notification update. Test overdue reminders and manager escalation using the workspace settings.
15. Archive a recurring lead as a manager. Confirm pending tasks are cancelled, the lead leaves the active list, and its bookmarked detail/history remains accessible.

Prefer pausing manual test leads after testing, since their recorded history is deliberately retained. Automated tests remove only their own fixtures.

## Automated verification

Database/service and regression tests:

```sh
npx vitest run tests/recurringLeadAccountability.test.js tests/leadRecurrence.test.js tests/leadRecurrencePersistence.test.js tests/recurringLeadImport.test.js tests/pagination.test.js tests/productionSecurity.test.js tests/openWorkspace.test.js tests/customerIntegrity.test.js tests/taskService.test.js tests/automationScheduler.test.js tests/testFixtureCleanup.test.js tests/publicTableAccess.test.js --testTimeout=15000
```

Browser tests, while the updated server runs on port 3011:

```sh
npx playwright test --config e2e/recurring-leads.config.js
```

Set `CRM_E2E_URL` to use another server. Browser tests create their own temporary rep and leads and clean those fixtures up. Account switching in these tests uses the CRM's shared workspace mode; session-authenticated environments require an authenticated test setup instead.
