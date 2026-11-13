# Loading and navigation

All reads still use the Express API. The frontend does not query Supabase.

## View inventory and skeletons

| View | Layout mirrored |
| --- | --- |
| Dashboard | Welcome/actions, four summary tiles, work queue (four rows) or recent activity, pipeline stage bars, follow-ups and outreach panels. Existing dashboard grids provide the responsive breakpoints. |
| Leads | Header/actions, regular/recurring tabs, search and owner/source/stage filters, quick filters, eight-column desktop table, mobile cards and pagination. The recurring variant uses the ten schedule/accountability columns. |
| Pipeline | Header/search, filter pills and horizontally scrolling stages. Columns use the real 85vw mobile / 320px desktop widths, counts, totals and varying card heights. |
| Contacts | Header, search/company filter, five-column table; optional selected-contact detail pane. |
| Companies | Header, search, six-column table; optional selected-company detail pane. |
| Tasks | Search, header, queue/scope/type controls, separate due-date groups with checkbox/title/owner/date rows; approval variant includes review content/actions. |
| Employees | Header and responsive one/two/four-column member workload cards. |
| Reports | Header/filters, five metrics, forecast/target, customer value table, loss-stage bars, loss-reason tiles and audit table. |
| Settings | Header, horizontal settings tabs and branding form; follow-up rules have their own rule-row skeleton. |
| Connections | Heading/description, Workspace provider card, account/status details and action slots. |
| Lead Journey | Header, six key-field cards, stage path, composer/details and activity timeline. |
| Drawer / Unified Timeline | Existing record header stays visible; activity history uses event cards with markers, metadata and text. Older-page requests append one timeline placeholder. |
| Auxiliary loads | Search results, relationship choices, attachments, cycle-history forms, and workbook processing use local placeholders. |

Only blocks, text, avatars, table rows and status/delay behavior are shared. Each page owns its layout.

## Cache and prefetch

- A bounded LRU holds at most 100 responses. Keys normalize resource, filter values and cursor, including omitted optional filters.
- A mounted record hook reads the cache immediately, then always revalidates through Express. Existing results, including empty results, stay visible during search, paging, mutations and retries. Search retains its 250ms debounce.
- One request per key serves independent subscribers. Aborting one subscriber does not cancel another; the network request is aborted when the final subscriber leaves. Aborted and failed requests are not cached.
- After boot/login, idle work imports permitted view chunks, fetches permitted extra state collections and warms the precise default query shapes for leads (including recurring leads), the default pipeline, contacts, companies, tasks and dashboard queues/activity/follow-ups. Reports and Connections also reuse cached responses.
- Sidebar and mobile navigation import chunks on hover, focus and touchstart. Dashboard remains eagerly imported.
- The existing reload/revision path conservatively invalidates all cached pages, covering related records across resources. The active hooks refetch and idle work warms the default pages again. Logout and account selection clear responses and abort pending requests; changes to the workspace account scope clear them as well.
- Switching pipelines keeps the previous board visible and temporarily inert until the next board arrives.
- Skeletons reserve geometry immediately and reveal after 150ms through CSS. Status wrappers expose their page name and busy state; decorative blocks are hidden from accessibility APIs. Reduced-motion disables pulsing.

## Verification

Run `npm run lint`, `npm test`, and `npm run test:e2e`.

Verified: lint passes; all 172 unit/integration tests and all 47 Playwright tests pass. The Vite production build also passes.

The default Playwright configuration uses port 3000. Restart an already-running development server after backend changes. Verification here used a fresh Express server on port 3012, with a separate HMR port so the existing development server could keep running.

The dashboard query needed a small alias correction: deal visibility/mock filters now run inside a subquery where their `r` alias actually names Deal. No schema changes or migrations were needed.

The historical-reference test now creates and removes its own unresolved/repaired fixtures instead of assuming a fixed number of live unresolved records. Legacy browser scenarios explicitly enable their demonstration records, search for records outside the first page, and use current labels.

## Manual checklist

1. Open DevTools, select **Slow 3G**, disable the browser HTTP cache, and reload each hash route. Check the page-specific boot/content skeleton at desktop and mobile widths.
2. Visit Dashboard, Leads, Pipeline, Contacts, Companies, Tasks, Team, Reports, Settings and Connections. Verify their columns, controls, cards and spacing match the loaded view. Check recurring leads, follow-up rules, drawers, lead journeys and older timeline history too.
3. Wait for idle warming, then switch repeatedly between tabs. Cached content should appear immediately and update quietly. In Network, verify identical concurrent page queries share one request.
4. Change search, filters, pages and pipelines. Existing content should remain visible; pipeline actions stay disabled while a different board is pending.
5. Add a lead and a deal. Edit and delete eligible test records. Verify lists, queues, counts, related drawers and later tab visits show the updated data.
6. Switch Admin/Manager/Rep accounts and sign out/in where supported. Confirm cached records from another account never appear and inaccessible pages are not prefetched.
7. Enable reduced motion; verify placeholders do not pulse. Use keyboard navigation and Cmd/Ctrl+K; check retry alerts still work when a request fails.

## Added files

- [frontend/api/recordsCache.js](../frontend/api/recordsCache.js)
- [frontend/viewPrefetch.js](../frontend/viewPrefetch.js)
- [frontend/components/skeletons/DashboardSkeleton.jsx](../frontend/components/skeletons/DashboardSkeleton.jsx)
- [frontend/components/skeletons/LeadsSkeleton.jsx](../frontend/components/skeletons/LeadsSkeleton.jsx)
- [frontend/components/skeletons/PipelineSkeleton.jsx](../frontend/components/skeletons/PipelineSkeleton.jsx)
- [frontend/components/skeletons/ContactsSkeleton.jsx](../frontend/components/skeletons/ContactsSkeleton.jsx)
- [frontend/components/skeletons/CompaniesSkeleton.jsx](../frontend/components/skeletons/CompaniesSkeleton.jsx)
- [frontend/components/skeletons/TasksSkeleton.jsx](../frontend/components/skeletons/TasksSkeleton.jsx)
- [frontend/components/skeletons/EmployeesSkeleton.jsx](../frontend/components/skeletons/EmployeesSkeleton.jsx)
- [frontend/components/skeletons/ReportsSkeleton.jsx](../frontend/components/skeletons/ReportsSkeleton.jsx)
- [frontend/components/skeletons/SettingsSkeleton.jsx](../frontend/components/skeletons/SettingsSkeleton.jsx)
- [frontend/components/skeletons/ConnectionsSkeleton.jsx](../frontend/components/skeletons/ConnectionsSkeleton.jsx)
- [frontend/components/skeletons/LeadJourneySkeleton.jsx](../frontend/components/skeletons/LeadJourneySkeleton.jsx)
- [frontend/components/skeletons/TimelineSkeleton.jsx](../frontend/components/skeletons/TimelineSkeleton.jsx)
- [frontend/components/skeletons/PageSkeleton.jsx](../frontend/components/skeletons/PageSkeleton.jsx)
- [frontend/components/skeletons/primitives.jsx](../frontend/components/skeletons/primitives.jsx)
- [tests/recordsCache.test.js](../tests/recordsCache.test.js)
- [e2e/loading.spec.js](../e2e/loading.spec.js)
- [docs/loading-and-prefetching.md](../docs/loading-and-prefetching.md)

## Changed files in this task

- [frontend/App.jsx](../frontend/App.jsx)
- [frontend/api/crmClient.js](../frontend/api/crmClient.js)
- [frontend/hooks/useRecordsPage.js](../frontend/hooks/useRecordsPage.js)
- [frontend/index.css](../frontend/index.css)
- [frontend/components/AttachmentsPanel.jsx](../frontend/components/AttachmentsPanel.jsx)
- [frontend/components/CompaniesView.jsx](../frontend/components/CompaniesView.jsx)
- [frontend/components/ConnectionsView.jsx](../frontend/components/ConnectionsView.jsx)
- [frontend/components/ContactsView.jsx](../frontend/components/ContactsView.jsx)
- [frontend/components/DashboardView.jsx](../frontend/components/DashboardView.jsx)
- [frontend/components/DetailDrawer.jsx](../frontend/components/DetailDrawer.jsx)
- [frontend/components/Header.jsx](../frontend/components/Header.jsx)
- [frontend/components/ImportExportModal.jsx](../frontend/components/ImportExportModal.jsx)
- [frontend/components/LeadJourneyView.jsx](../frontend/components/LeadJourneyView.jsx)
- [frontend/components/LeadsView.jsx](../frontend/components/LeadsView.jsx)
- [frontend/components/ManifestStrip.jsx](../frontend/components/ManifestStrip.jsx)
- [frontend/components/PipelineView.jsx](../frontend/components/PipelineView.jsx)
- [frontend/components/RecordPagination.jsx](../frontend/components/RecordPagination.jsx)
- [frontend/components/RecordSelect.jsx](../frontend/components/RecordSelect.jsx)
- [frontend/components/RecurringCycleDialog.jsx](../frontend/components/RecurringCycleDialog.jsx)
- [frontend/components/RecurringLeadImportModal.jsx](../frontend/components/RecurringLeadImportModal.jsx)
- [frontend/components/RecurringLeadsPanel.jsx](../frontend/components/RecurringLeadsPanel.jsx)
- [frontend/components/ReportsView.jsx](../frontend/components/ReportsView.jsx)
- [frontend/components/SettingsView.jsx](../frontend/components/SettingsView.jsx)
- [frontend/components/Sidebar.jsx](../frontend/components/Sidebar.jsx)
- [frontend/components/TasksView.jsx](../frontend/components/TasksView.jsx)
- [frontend/components/UnifiedTimeline.jsx](../frontend/components/UnifiedTimeline.jsx)
- [backend/services/dashboardService.js](../backend/services/dashboardService.js)
- [tests/referenceReconciliation.test.js](../tests/referenceReconciliation.test.js)
- [e2e/lead-journey.spec.js](../e2e/lead-journey.spec.js)
- [e2e/mobile-responsive.spec.js](../e2e/mobile-responsive.spec.js)

Other pre-existing backend/controller/query/helper edits in the checkout were left intact.

