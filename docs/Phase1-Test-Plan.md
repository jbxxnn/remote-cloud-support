# Phase 1 Test Plan (MVP Foundations)

Structured, step-by-step scenarios to verify Phase 1 functionality. Each step lists actions, data, and expected outcomes.

## 0. Environment & Users
- **Preconditions**: App running (`npm run dev` or deployed), database seeded with an admin and staff user, at least one client/device/alert and one SOP configured.
- **Users**:
  - Admin: can access `/admin`, manage clients/devices/SOPs.
  - Staff: can access `/staff`, complete SOPs, view alerts.

## 1. Authentication & Roles
1. **Login as Admin**
   - Navigate `/login`, submit admin credentials.
   - *Expect*: Redirect to `/admin`; sidebar shows Admin modules; no 401/403.
2. **Login as Staff**
   - Navigate `/login`, submit staff credentials.
   - *Expect*: Redirect to `/staff`; admin pages redirect to `/`; staff-only APIs authorized.
3. **Session Persistence**
   - Refresh after login.
   - *Expect*: Session persists; still authorized.

## 2. Staff Dashboard (3-Column Layout)
1. **Layout & Responsiveness**
   - Visit `/staff`.
   - *Expect*: Three columns (Live Alerts, Active Clients, System Snapshot); columns stack on narrow screens without overflow.
2. **Empty States**
   - Temporarily clear alerts/clients data.
   - *Expect*: Live Alerts shows “No active alerts”; Active Clients shows “All clients stable”; System Snapshot shows placeholder.

## 3. Live Alerts Feed
1. **List & Severity**
   - Ensure at least one alert exists.
   - *Expect*: Severity color coding; latest alert on top.
2. **Click to Details**
   - Click an alert row.
   - *Expect*: Opens alert details/context or navigation to alert page.
3. **Real-Time / Refresh**
   - Trigger a new detection/alert or refresh.
   - *Expect*: New alert appears; no stale cache errors.

## 4. Active Clients Grid
1. **Render & Counts**
   - View grid.
   - *Expect*: Client cards show name, status, counts; hover/expand (if implemented) shows more info.
2. **Navigation**
   - Click a client card.
   - *Expect*: Navigates to client detail page.
3. **Empty State**
   - With no active clients.
   - *Expect*: “All clients stable”.

## 5. System Snapshot
1. **Widgets & Auto-Refresh**
   - Observe snapshot for 30s.
   - *Expect*: Auto-refresh without layout shift; connectivity indicator present.
2. **Validators Placeholder**
   - *Expect*: Placeholder/section for validators visible (non-functional in Phase 1).

## 6. SOP Workflow (Minimum)
1. **Fetch SOP List (Staff)**
   - As staff, open SOP list (via alert context or client SOPs).
   - *Expect*: SOPs load without 401; event/alert mapping works.
2. **Start SOP Response**
   - Click “Start SOP”.
   - *Expect*: SOP response created; initial validation runs; no “Failed to fetch SOP” errors.
3. **Complete Steps**
   - Mark steps complete, add notes/evidence where required.
   - *Expect*: Validation errors shown when required steps/notes missing; warnings for recommended fields.
4. **Complete SOP**
   - Click “Complete SOP”.
   - *Expect*: Status changes to completed; completion timestamp stored; validation passes (no blocking errors).

## 7. Alerts → SOP Link
1. **Open Alert and Start SOP**
   - From an alert, start linked SOP (if configured).
   - *Expect*: SOP fetched (staff allowed); SOP response tied to alert/client.
2. **Verify Linkage**
   - After completion, check alert timeline/status.
   - *Expect*: Alert shows SOP activity or status update as designed.

## 8. Admin Core Management
1. **Clients CRUD**
   - Create/edit/delete client from `/admin/clients`.
   - *Expect*: API 200/201; list refreshes; validations for required fields.
2. **Devices CRUD**
   - Create/edit/delete device.
   - *Expect*: Device list updates; associations valid.
3. **SOPs CRUD**
   - Create/edit SOP with steps; assign to event type.
   - *Expect*: SOP persists; staff can read SOP (staff GET allowed); steps visible in staff flow.

## 9. API Spot Checks (Auth)
- **Admin-only endpoints** (e.g., `/api/clients`, `/api/sops`, `/api/admin/*`):
  - *Expect*: 200 for admin; 401/403 for staff.
- **Staff endpoints** (e.g., `/api/staff/clients/[id]/sops`, `/api/staff/sidebar-stats`):
  - *Expect*: 200 for staff; 401/403 for admin hitting staff-only paths (if enforced) or allowed if shared.

## 10. Validation (Phase 1 Scope)
- SOP validation runs when starting/completing SOP:
  - *Expect*: Blocking errors for missing required steps/notes; warnings for optional gaps.
- No global validator engine enforcement yet (that’s later stages).

## 11. Performance & Stability (Smoke)
- **Page reloads**: No errors in console/network.
- **Slow network**: Pages still render; loaders show; no uncaught exceptions.
- **Mobile viewport**: Critical UI (alerts, SOP steps, buttons) remains usable.

## 12. Expected Outcomes (Pass Criteria)
- Roles: Admin/staff routing and API access are correct.
- Dashboard: Three columns render, scroll, and show correct empty states.
- Alerts: Visible, clickable, severity-coded; new alerts appear on refresh.
- Clients: Grid renders, navigates; empty state works.
- System Snapshot: Shows widgets/placeholders; refreshes without breaking layout.
- SOPs: Staff can start and complete SOPs; validation blocks missing required data; completion succeeds.
- Admin CRUD: Clients/devices/SOPs can be created/updated/deleted; staff can read SOPs.
- APIs: Auth boundaries enforced (admin vs staff).
- No blocking console errors during flows above.

## 13. Nice-to-Have Checks (Optional for Phase 1)
- Live alerts polling/WebSocket updates.
- Alert detail drawer/page shows timeline and SOP link.
- Documentation/status widgets in snapshot show meaningful data.
- Basic accessibility: Keyboard navigation on forms/tables; focus states visible.




