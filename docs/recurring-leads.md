# Recurring leads: setup and testing

## Where to find it

Open **Leads → Recurring Leads**. **All Leads** also includes these records, marked **Recurring**.

The desktop table uses the earlier layout: **Lead name, Company, Email / phone, Status, Assigned employee, Recurrence date, Next recurrence, Next follow-up, Last contacted, Actions**. Recurrence date is the schedule's anchor; Next recurrence is the current expected purchase date. The repeat pattern appears below the recurrence date, with monthly-review and overdue indicators alongside the relevant fields.

Use the row actions:

- **Pencil:** edit the lead, assigned employee, and future repeat schedule (administrator).
- **Arrows:** open **Update cycle**, including confirmation, notes, follow-up dates, monthly review, cycle history, and manager pause/resume controls. For a paused schedule this opens **View cycle**.
- **Trash:** request deletion (administrator), with confirmation. Records with linked data or cycle history remain protected; pause those schedules instead.
- **Lead name:** open the lead details. Email and phone links open your mail or calling app.

Scroll the desktop table sideways on narrower screens to reach every column. Phones use cards with the same cycle and schedule actions. All recurring-view filters remain above the table.

The verification preview runs at **http://localhost:3011/#leads**. If you use your original server on port 3000, restart that server to load the new backend routes. Refreshing the browser alone does not restart the backend.

The database migration has been applied to the database configured in this workspace. Existing lead records and their expected purchase dates are preserved. Other environments need the normal migration and build steps:

```sh
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

1. Open **Recurring Leads**, or click **Update cycle** on a recurring task in **Tasks** or the dashboard.
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
- A confirmed purchase stays open. If its expected date arrives without a received-purchase outcome, a verification task is created.
- Each assigned active lead also gets a monthly review task, due on the last day of the month. This includes customers whose purchases are several months apart.
- A meaningful cycle update completes outstanding monthly review tasks. It does not automatically close an unresolved purchase cycle.
- A missed reminder is overdue even if the expected purchase is still in the future.
- Recurring tasks require **Update cycle**; the ordinary task completion/deletion endpoints cannot bypass the required notes and outcome.
- Repeated automation runs do not duplicate reminders. Reassigning a lead transfers pending recurring tasks to its new owner and removes the old rep's access to the lead.

Reminders appear inside the CRM in **Tasks** and the dashboard. To generate future reminders automatically during local use, keep the existing automation worker running in another terminal:

```sh
npm run worker
```

To run the existing automation once:

```sh
npm run automation:once
```

Those commands also run the CRM's other existing automation jobs. The existing Vercel cron route runs the same automation cycle in deployed environments; its authentication and scheduler must be configured there. Merely opening the web app does not start a background worker.

## What the manager sees

Filter by **Responsible rep**, then use **Overdue**, **Due today**, **Next 10 days**, **Awaiting confirmation**, **Missing monthly update**, or **Unassigned**.

**Missing monthly update** means there is no recorded cycle update in this calendar month. It appears throughout the month as an action needed; the monthly review task becomes overdue after its month-end deadline.

Administrators and managers can pause/resume a schedule with a reason through **Update cycle → Manager controls**. Pausing suspends future reminder generation and monthly review requirements. Existing tasks, overdue dates, and history remain visible. Resuming retains the unresolved cycle.

Cycle history shows the latest 24 cycles and 30 updates. The complete update history remains in lead activities and the audit trail. Records with cycle history are protected from deletion; pause a discontinued schedule to retain its history.

## Quick manual test

1. As an administrator, create a lead named **Recurring test**, assign a rep, choose monthly repetition, and set its first purchase **10 days from today**.
2. Switch to that rep's account. Confirm the lead appears under **All Leads** and **Recurring Leads**; another rep should not see it.
3. Open **Tasks**. The first reminder and monthly review task should exist. Choose **Update cycle**.
4. Save **Awaiting response**, a useful note, and a follow-up for tomorrow. Confirm the expected purchase date stays the same, the monthly review changes to **Reviewed**, and history contains the note.
5. As a manager/admin, select **Missing monthly update**. That lead should no longer appear in the current month.
6. Create another test lead with its first purchase **5 days from today**. Both reminder thresholds have been reached, so both reminders should exist. Running automation again should not duplicate them.
7. Create a test lead with an expected purchase yesterday. Confirm it stays in **Overdue** after refreshing the page. Also test a future purchase with a follow-up yesterday; that should be overdue too.
8. Test **Rescheduled / postponed** with a new date and a reason. The current date changes and the original remains in history.
9. Test **Purchase confirmed**. It must remain open. To record **Purchase received**, choose a linked won deal. The next cycle should then appear.
10. Test pause/resume as a manager, including a reason. A sales rep should not have those controls.
11. Try a schedule with selected monthly dates and check the mobile layout.

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
