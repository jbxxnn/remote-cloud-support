# Phases 1–4 Test Plan (Step-by-Step with Expected Outcomes)

Structured scenarios to validate the system from MVP Foundations (Phase 1) through Compliance & Incident workflows (Phase 4). Each step includes actions and expected outcomes.

---

## Phase 1 — MVP Foundations (Staff Dashboard, SOP Basics)
1) Auth & Roles  
   - Login as admin ⇒ lands on `/admin`; admin APIs 200; staff-only APIs 401/403.  
   - Login as staff ⇒ lands on `/staff`; admin routes redirect/403; session persists on refresh.

2) Staff Dashboard (3 columns)  
   - `/staff` shows Live Alerts, Active Clients, System Snapshot; responsive on narrow screens.  
   - Empty states: “No active alerts”, “All clients stable”, snapshot placeholder.

3) Live Alerts Feed  
   - Alerts render with severity color; newest first.  
   - Click alert ⇒ opens details/context.  
   - New alert (trigger/refresh) appears without errors.

4) Active Clients Grid  
   - Cards show name/status/counts; clicking navigates to client detail.  
   - Empty state when no active clients.

5) System Snapshot  
   - Widgets/placeholder visible; auto-refresh (≈30s) without layout shift.

6) SOP Workflow (Minimum)  
   - Staff can list SOPs, start SOP response ⇒ created without 401.  
   - Completing steps with required notes/evidence passes validation; missing required fields show blocking errors; warnings for optional gaps.  
   - Completing SOP sets status completed, timestamps saved.

7) Alerts → SOP Link  
   - From alert, start linked SOP ⇒ SOP fetched, tied to alert/client.  
   - Alert timeline/status reflects SOP activity (if present).

8) Admin CRUD  
   - Clients/Devices/SOPs create/edit/delete succeed; required fields validated.  
   - Staff can read SOPs (GET allowed).

Expected outcomes: Roles enforced; dashboard stable; alerts visible/clickable; SOPs start/complete with validation; admin CRUD works; no blocking console errors.

---

## Phase 2 — Validation & Assistant (Unified Validator, Compliance Basics)
1) Validator API  
   - POST `/api/validation/validate` with valid payload (sop/record/compliance) ⇒ `isValid=true`, summary “Validation successful”.  
   - Invalid payload ⇒ `isValid=false`, blocking errors with `field`, `message`, `severity`, `blocking`, `ruleRef`.

2) SOP Validator (UI)  
   - Start SOP with missing required step/notes ⇒ blocking errors shown; cannot complete.  
   - Add notes/evidence per rules ⇒ errors clear; can complete.

3) Record Validator  
   - Missing timestamp/staffId/description ⇒ blocking errors; warnings for future/old timestamps or short descriptions.  
   - Fix fields ⇒ result `isValid=true`, `canSubmit=true`.

4) Compliance Validator  
   - Incident record type=incident, short description/location missing ⇒ errors with OAC refs; adding required data clears errors.  
   - Service record with short description ⇒ warning (non-blocking).

5) Validator Engine (Multiple)  
   - validateMultiple with missing validator ⇒ error entry for that type, combined summary reflects blocking error.  
   - With all registered validators ⇒ aggregated errors/warnings combined correctly.

6) Assistant Compliance Skills  
   - Ask “Why is this invalid?” with context ⇒ returns formatted errors, rule refs, suggestions.  
   - “Show OAC rule 5123.0412” ⇒ returns rule details.  
   - “Auto-fix this” with fixable issues ⇒ applies safe fixes (timestamp, staffId, future time); returns summary and warnings.

7) Auto-Fix API  
   - POST `/api/validation/auto-fix` with missing timestamp/staffId ⇒ response includes fixedData, fixedIssues>0, revalidation isValid=true.  
   - Unfixable (short description) remains in `unfixableIssues`.

Expected outcomes: Validation endpoints return structured results with ruleRef/severity/blocking; UI shows errors/warnings; assistant can explain rules and auto-fix safe issues.

---

## Phase 3 — Incident Pipeline (MUI/UI Drafting)
1) Incidents Table Migration  
   - Migration applied: `Incident` table exists with incidentType/status/draftData/finalizedData; FKs to Alert/Client/User.

2) MUI Draft Generator  
   - POST `/api/incidents/drafts` with alertId ⇒ returns incident draft, status draft.  
   - Draft includes: incidentType (MUI/UI inference), description, actionsTaken, timeline, staff list, validationResults summary.
   - Re-run for same alert ⇒ updates draft, does not create duplicate.

3) Draft Sources  
   - SOP responses linked to alert populate actionsTaken/completedSteps counts.  
   - Timeline from AlertEvents appears chronologically.  
   - AI analysis present when tags/transcript exist (riskLevel, summary, criticalTags).

4) Admin Review Workflow  
   - `/admin/incidents` lists incidents with filters and status/type badges.  
   - Open “Review” ⇒ IncidentReview dialog shows overview, description, staff, actions, timeline, AI analysis, validation results.  
   - Approve/Reject via `/api/incidents/[id]/review` POST status=review/draft updates status, reflects in list.

Expected outcomes: Drafts generate/update from alerts; review UI works; statuses change correctly; validation data visible in draft details.

---

## Phase 4 — Compliance & Assistant (Completed)
### 4.1 Validators
1) Compliance/Record/SOP validators registered and used by validation API; ruleRef/severity/blocking populated.

### 4.2 Assistant + Compliance
1) “Explain errors / Show OAC rule / Auto-fix this” flows return formatted guidance, rule refs, applied fixes.
2) Auto-fix service: fixable issues (timestamp, staffId, future time, location warning) are fixed; unfixable content issues remain.

### 4.3 Incident Finalization & Lock
1) Finalize API `/api/incidents/[id]/finalize`  
   - Finalizes draft → status finalized, finalizedData stored, checksum generated.  
   - Optional lock (PUT) sets status locked; locked incidents reject further status edits.
2) Integrity verify `/api/incidents/[id]/finalize/verify`  
   - Returns valid=true when checksum matches; tampering would fail.

### 4.4 Compliance Dashboard
1) Compliance Score  
   - `/api/admin/compliance/score` returns overallScore and breakdown; widget shows score, breakdown, trend.
   - Historical mode `?historical=true&days=7` returns trend data.
2) Validation History  
   - `/api/admin/compliance/validation-history` lists SOP/incident validations; filters by date/type/status; UI table shows counts, details with rule refs.
3) Incident Overview  
   - `/api/admin/compliance/incidents` returns incidents + summary (by status/type, complianceRate); UI lists incidents with filters and opens review dialog.
4) Audit Log Export  
   - `/api/admin/compliance/audit-logs/export?format=csv|pdf&startDate&endDate` downloads CSV/PDF with SOP, incident, alert events; UI export button works; filenames include date; PDF has summary + pagination.

Expected outcomes: Compliance dashboard shows scores, history, incidents; exports succeed in CSV/PDF; finalization locks data with checksum verification; assistant/compliance flows operational.

---

## Quick Smoke Checklist (All Phases)
- Auth/roles routing correct (admin vs staff).
- Staff dashboard stable; alerts visible; SOPs start/complete with validation.
- Validation API returns structured errors/warnings; auto-fix works for fixable cases.
- Incident drafts generate from alerts; review/finalize/lock flows succeed; checksum verifies.
- Compliance dashboard: score, validation history, incident overview, audit export all load without errors.
- CSV/PDF exports download and open; data matches filters/date range.




