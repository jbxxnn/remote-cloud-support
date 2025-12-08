# SupportSense - Detailed Implementation Plan

This document breaks down the SupportSense Feasible Staged Implementation Plan into detailed, actionable tasks based on the current project state.

## Current State Assessment

**Already Implemented:**
- ✅ Basic Staff & Admin dashboards with 3-column layout
- ✅ Client, Device, SOP, User management APIs
- ✅ Authentication with role-based access (admin/staff)
- ✅ Database schema with core tables (Users, Clients, Devices, Detections, SOPs, Alerts, AlertEvent, Event, EventAction)
- ✅ SupportSense Assistant UI (drawer, chat, context detection) - Training mode only
- ✅ Header bar with RCE branding
- ✅ System snapshot component
- ✅ Live alerts feed
- ✅ Active clients grid
- ✅ SOP management (create, edit, view)
- ✅ Alert acknowledgment and resolution workflow
- ✅ Event system (Event and EventAction tables)

**Missing/Incomplete:**
- ❌ SOP Response Records (database table and UI)
- ❌ Event timeline UI and linking
- ❌ Gemini Notation System
- ❌ Compliance validation framework
- ❌ Sync architecture (Synology/Google Drive)
- ❌ Export system with annotations
- ❌ Incident automation (MUI/UI)
- ❌ Full AI backend for Assistant (currently training mode)
- ❌ Validator engine
- ❌ Knowledge base

---

# STAGE 1 — MVP Foundations (Working System)

**Goal:** Staff can log in, view alerts, complete SOPs, and produce a basic event record.

## 1.1 Core UI (Staff Dashboard) - Status: ✅ MOSTLY COMPLETE

### Task 1.1.1: Verify 3-Column Dashboard Layout
**Files to review:**
- `src/app/staff/staff-dashboard.tsx` - Already has 3-column layout
- `src/components/staff/live-alerts-feed.tsx` - Verify implementation
- `src/components/staff/active-clients-grid.tsx` - Verify implementation
- `src/components/staff/system-snapshot.tsx` - Verify implementation

**Action Items:**
- [ ] Review current implementation and ensure all 3 columns are properly functional
- [ ] Verify responsive behavior on smaller screens
- [ ] Test empty states for each column
- [ ] Ensure proper scrolling and overflow handling

### Task 1.1.2: Enhance Login & Role System
**Files to review:**
- `src/app/login-form.tsx` - Verify login implementation
- `src/lib/auth.ts` - Verify role-based access
- `src/app/api/auth/[...nextauth]/route.ts` - Verify NextAuth configuration

**Action Items:**
- [ ] Verify staff/admin role separation works correctly
- [ ] Test login flow for both roles
- [ ] Ensure proper session management
- [ ] Add role-based redirects if missing

### Task 1.1.3: Enhance Live Alerts Feed
**Files to modify:**
- `src/components/staff/live-alerts-feed.tsx` - Add enhancements

**Action Items:**
- [ ] Add alert severity color coding (if not present)
- [ ] Add animation on new alert arrival
- [ ] Add click handler to open alert details
- [ ] Add real-time updates (polling or WebSocket)
- [ ] Add empty state: "No active alerts"

### Task 1.1.4: Enhance Active Clients Grid
**Files to modify:**
- `src/components/staff/active-clients-grid.tsx` - Add enhancements

**Action Items:**
- [ ] Add client profile expansion on hover
- [ ] Add status timeline display
- [ ] Add ISP goal tags display
- [ ] Add click handler to navigate to client detail
- [ ] Add empty state: "All clients stable"

### Task 1.1.5: Enhance System Snapshot
**Files to modify:**
- `src/components/staff/system-snapshot.tsx` - Add validators placeholder

**Action Items:**
- [ ] Add placeholder for validators (non-functional for now)
- [ ] Ensure auto-refresh every 30 seconds
- [ ] Add connectivity status indicator
- [ ] Add documentation status widget
- [ ] Add active tasks widget

## 1.2 SOP Module (Minimum Required) - Status: ⚠️ PARTIALLY COMPLETE

### Task 1.2.1: Create SOP Response Records Table
**Files to create:**
- `database/migration-007-add-sop-responses-table.sql` - New migration

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "SOPResponse" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sopId" TEXT NOT NULL,
    "eventId" TEXT,
    "clientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "completedSteps" JSONB NOT NULL, -- Array of completed step objects
    "notes" TEXT,
    "status" TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sopId") REFERENCES "SOP"(id) ON DELETE CASCADE,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE SET NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("staffId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sop_response_sop_id ON "SOPResponse"("sopId");
CREATE INDEX IF NOT EXISTS idx_sop_response_event_id ON "SOPResponse"("eventId");
CREATE INDEX IF NOT EXISTS idx_sop_response_client_id ON "SOPResponse"("clientId");
CREATE INDEX IF NOT EXISTS idx_sop_response_staff_id ON "SOPResponse"("staffId");
CREATE INDEX IF NOT EXISTS idx_sop_response_status ON "SOPResponse"("status");
```

**Action Items:**
- [ ] Create migration file
- [ ] Run migration script
- [ ] Verify table creation

### Task 1.2.2: Create SOP Response API
**Files to create:**
- `src/app/api/sop-responses/route.ts` - GET (list), POST (create)
- `src/app/api/sop-responses/[id]/route.ts` - GET (single), PUT (update), PATCH (complete step)

**API Endpoints:**
- `GET /api/sop-responses` - List all SOP responses (with filters)
- `POST /api/sop-responses` - Create new SOP response
- `GET /api/sop-responses/[id]` - Get single SOP response
- `PUT /api/sop-responses/[id]` - Update SOP response
- `PATCH /api/sop-responses/[id]/complete-step` - Mark step as complete

**Action Items:**
- [ ] Implement GET endpoint with filtering (by client, event, status)
- [ ] Implement POST endpoint to create new response
- [ ] Implement GET by ID endpoint
- [ ] Implement PUT endpoint to update response
- [ ] Implement PATCH endpoint for step completion
- [ ] Add authentication checks (staff role required)
- [ ] Add validation for required fields

### Task 1.2.3: Create SOP Response UI Component
**Files to create:**
- `src/components/sops/sop-response-form.tsx` - Form for completing SOP steps
- `src/components/sops/sop-step-item.tsx` - Individual step component

**Files to modify:**
- `src/app/staff/client/[id]/page.tsx` - Integrate SOP response form

**Component Features:**
- Display SOP steps sequentially
- Checkbox/button to mark step as complete
- Text area for step notes
- Timestamp capture for each step
- Save progress (auto-save or manual save)
- Complete SOP response button
- Show progress indicator (X of Y steps completed)

**Action Items:**
- [ ] Create SOP response form component
- [ ] Create step item component
- [ ] Add step completion logic
- [ ] Add notes capture per step
- [ ] Add progress tracking
- [ ] Integrate into client detail page
- [ ] Add loading states
- [ ] Add error handling

### Task 1.2.4: Link SOP Responses to Events
**Files to modify:**
- `src/app/api/sop-responses/route.ts` - Link to event when creating
- `src/app/api/events/[id]/route.ts` - Add SOP response linking

**Action Items:**
- [ ] Update SOP response creation to accept eventId
- [ ] Auto-link SOP response to event when created from event context
- [ ] Add API endpoint to link existing SOP response to event
- [ ] Update event detail view to show linked SOP responses

## 1.3 Alert System (Event = Alert) - Status: ⚠️ PARTIALLY COMPLETE

**Note:** In this system, "Event" and "Alert" are the same thing. Alerts are the events that staff work with.

### Task 1.3.1: Enhance Alert Linking
**Files to review:**
- `database/schema.sql` - Verify Alert table structure
- `database/migration-003-add-alert-events-table.sql` - Verify AlertEvent table
- `src/app/api/staff/clients/[id]/alerts/route.ts` - Verify alert workflow tracking

**Action Items:**
- [x] Verify alerts have AlertEvent tracking (already implemented)
- [x] Ensure alert table has required fields (status, assignedTo, etc.)
- [x] Verify alert status updates work correctly
- [ ] Verify alert-to-SOP-response linking works

### Task 1.3.2: Create Alert Timeline Component
**Files to create:**
- `src/components/alerts/alert-timeline.tsx` - Timeline visualization
- `src/components/alerts/alert-timeline-item.tsx` - Individual timeline entry

**Files to modify:**
- `src/app/staff/client/[id]/page.tsx` - Add alert timeline display

**Component Features:**
- Display alerts chronologically
- Show alert type, timestamp, staff member, message
- Link to related SOP responses
- Color code by severity
- Show alert actions (AlertEvent records)
- Expandable details

**Action Items:**
- [ ] Create timeline component
- [ ] Create timeline item component
- [ ] Fetch alerts and AlertEvents for client
- [ ] Sort by timestamp
- [ ] Display alert details
- [ ] Link to related SOP responses
- [ ] Add expand/collapse functionality
- [ ] Integrate into client detail page

### Task 1.3.3: Create Alert Summary API
**Files to create:**
- `src/app/api/alerts/[id]/summary/route.ts` - Generate alert summary

**Action Items:**
- [ ] Create endpoint to generate alert summary
- [ ] Include timeline of AlertEvent actions
- [ ] Include linked SOP responses
- [ ] Include related detection details
- [ ] Return formatted summary text

### Task 1.3.4: Enhance Alert Detail View
**Files to create:**
- `src/app/staff/alerts/[id]/page.tsx` - Alert detail page

**Files to modify:**
- `src/app/staff/client/[id]/page.tsx` - Add alert detail link

**Action Items:**
- [ ] Create alert detail page
- [ ] Display full alert information
- [ ] Show linked SOP responses
- [ ] Show alert timeline (AlertEvents)
- [ ] Show related detection details
- [ ] Add edit/update functionality
- [ ] Add resolution workflow

## 1.4 Assistant (MVP Version) - Status: ✅ UI COMPLETE, ⚠️ NEEDS STATIC GUIDANCE

### Task 1.4.1: Add Static Guidance Rules
**Files to create:**
- `src/lib/assistant/static-guidance.ts` - Static rules-based guidance

**Files to modify:**
- `src/lib/assistant/query-handlers.ts` - Add static response handlers
- `src/hooks/use-assistant.ts` - Wire static responses

**Static Guidance Rules:**
- Module-specific help text
- SOP step explanations
- Form field help
- Navigation guidance
- Basic FAQ responses

**Action Items:**
- [ ] Create static guidance service
- [ ] Add module-specific help text
- [ ] Add SOP step explanations
- [ ] Add form field help
- [ ] Wire into assistant hook
- [ ] Test static responses
- [ ] Update assistant to show static responses instead of training mode message

### Task 1.4.2: Enhance Context Detection
**Files to modify:**
- `src/lib/assistant/context-detector.ts` - Enhance detection
- `src/components/assistant/assistant-drawer.tsx` - Show detected context

**Action Items:**
- [ ] Detect SOP response context
- [ ] Detect event context
- [ ] Detect alert context
- [ ] Pass context to static guidance
- [ ] Display context in drawer header
- [ ] Test context detection accuracy

### Task 1.4.3: Add SOP Step Explanations
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add SOP explanations
- `src/components/sops/sop-step-item.tsx` - Add "Ask Assistant" button

**Action Items:**
- [ ] Create SOP step explanation database/mapping
- [ ] Add "Ask Assistant" button to each step
- [ ] Wire to static guidance
- [ ] Show step-specific help

### Task 1.4.4: Add Notes Assistance
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add notes suggestions
- `src/components/sops/sop-response-form.tsx` - Add assistant help for notes

**Action Items:**
- [ ] Add notes template suggestions
- [ ] Add field-specific guidance
- [ ] Add "What should I write?" assistant help
- [ ] Test notes assistance

## 1.5 Deployment - Status: ✅ BASIC SETUP COMPLETE

### Task 1.5.1: Verify Single Provider Configuration
**Files to review:**
- `src/lib/database.ts` - Database connection
- Environment variables setup

**Action Items:**
- [ ] Verify database connection works
- [ ] Test with single provider setup
- [ ] Document provider configuration
- [ ] Verify all migrations run successfully

### Task 1.5.2: Verify Basic Admin Panel
**Files to review:**
- `src/app/admin/admin-dashboard.tsx` - Admin dashboard
- `src/app/admin/clients/page.tsx` - Client management
- `src/app/admin/devices/page.tsx` - Device management
- `src/app/admin/sops/page.tsx` - SOP management
- `src/app/admin/staff/page.tsx` - Staff management

**Action Items:**
- [ ] Verify all admin panels are functional
- [ ] Test user management
- [ ] Test role assignment
- [ ] Test SOP upload/creation
- [ ] Test client/device management
- [ ] Add any missing CRUD operations

---

## Stage 1 Completion Checklist

- [ ] All 3-column dashboard components verified and enhanced
- [ ] SOP Response Records table created and migrated
- [ ] SOP Response API endpoints implemented
- [ ] SOP Response UI components created and integrated
- [ ] Event timeline component created and integrated
- [ ] Event summary API implemented
- [ ] Static guidance system implemented
- [ ] Assistant provides static help for SOPs and forms
- [ ] All admin panels verified
- [ ] Single provider configuration verified
- [ ] End-to-end test: Staff can log in, view alert, complete SOP, create event record

---

# STAGE 2 — Core Platform (Functional + Stable)

**Goal:** A full working operational system with usable support workflows for real clients.

## 2.1 Enhanced Dashboard - Status: ⚠️ NEEDS ENHANCEMENTS

### Task 2.1.1: Implement Alert Severity Logic
**Files to modify:**
- `src/components/staff/live-alerts-feed.tsx` - Add severity color coding
- `src/app/api/detections/route.ts` - Verify severity field
- `database/schema.sql` - Verify Detection table has severity field

**Severity Levels:**
- High: Red (critical alerts)
- Medium: Yellow (standard alerts)
- Low: Green (informational alerts)

**Action Items:**
- [ ] Verify severity field exists in Detection/Alert tables
- [ ] Add severity-based color coding to alert cards
- [ ] Add severity badge/indicator
- [ ] Sort alerts by severity (high first)
- [ ] Add severity filter option

### Task 2.1.2: Add Quick Actions
**Files to modify:**
- `src/components/staff/live-alerts-feed.tsx` - Add quick action buttons
- `src/components/staff/active-clients-grid.tsx` - Add quick actions

**Quick Actions:**
- Acknowledge alert (one-click)
- Open SOP (direct link)
- View client details
- Resolve alert

**Action Items:**
- [ ] Add "Acknowledge" button to alert cards
- [ ] Add "Open SOP" button with relevant SOPs
- [ ] Add "View Details" link
- [ ] Add "Resolve" button (with confirmation)
- [ ] Add loading states for actions
- [ ] Add success/error feedback

### Task 2.1.3: Add Client Tags & Risk Indicators
**Files to create:**
- `database/migration-008-add-client-tags.sql` - Add tags table

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "ClientTag" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    tag TEXT NOT NULL,
    "tagType" TEXT NOT NULL, -- 'risk', 'goal', 'custom'
    color TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_tag_client_id ON "ClientTag"("clientId");
```

**Files to modify:**
- `src/components/staff/active-clients-grid.tsx` - Display tags
- `src/app/api/clients/[id]/route.ts` - Add tags to client response
- `src/app/admin/clients/client-management.tsx` - Add tag management

**Action Items:**
- [ ] Create ClientTag table migration
- [ ] Add tags API endpoints (GET, POST, DELETE)
- [ ] Display tags on client tiles
- [ ] Add risk indicator badges
- [ ] Add ISP goal tags
- [ ] Add tag management in admin panel
- [ ] Color code tags by type

## 2.2 SOP Improvements - Status: ⚠️ NEEDS ENHANCEMENTS

### Task 2.2.1: Add Evidence Attachment
**Files to create:**
- `database/migration-009-add-evidence-table.sql` - Evidence storage
- `src/app/api/evidence/route.ts` - Evidence API
- `src/components/sops/evidence-upload.tsx` - Upload component

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Evidence" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sopResponseId" TEXT NOT NULL,
    "eventId" TEXT,
    "evidenceType" TEXT NOT NULL, -- 'photo', 'text', 'file', 'recording'
    "fileUrl" TEXT,
    "filePath" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE CASCADE,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE SET NULL,
    FOREIGN KEY ("uploadedBy") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_sop_response_id ON "Evidence"("sopResponseId");
CREATE INDEX IF NOT EXISTS idx_evidence_event_id ON "Evidence"("eventId");
```

**Action Items:**
- [ ] Create Evidence table migration
- [ ] Create evidence API endpoints
- [ ] Create file upload component
- [ ] Add photo upload (with preview)
- [ ] Add text evidence input
- [ ] Add file upload (PDF, documents)
- [ ] Integrate into SOP response form
- [ ] Add evidence display in SOP response view
- [ ] Add file storage (local or cloud)

### Task 2.2.2: Auto-Check Step Completeness
**Files to modify:**
- `src/components/sops/sop-response-form.tsx` - Add validation
- `src/lib/validation/sop-validator.ts` - Create SOP validator

**Validation Rules:**
- Required steps must be completed
- Required fields must be filled
- Timestamps must be valid
- Notes must meet minimum length (if required)

**Action Items:**
- [ ] Create SOP validator service
- [ ] Add step completeness checking
- [ ] Add real-time validation feedback
- [ ] Show validation errors inline
- [ ] Prevent submission if incomplete
- [ ] Add "Mark as complete" validation

### Task 2.2.3: SOP Response Record Export (PDF)
**Files to create:**
- `src/lib/export/sop-response-pdf.ts` - PDF generator
- `src/app/api/sop-responses/[id]/export/route.ts` - Export endpoint

**Files to modify:**
- `src/components/sops/sop-response-form.tsx` - Add export button

**PDF Contents:**
- SOP name and details
- Client information
- Staff member who completed
- Completed steps with timestamps
- Notes for each step
- Attached evidence list
- Event timeline
- Completion date

**Action Items:**
- [ ] Install PDF library (pdfkit, jsPDF, or similar)
- [ ] Create PDF template
- [ ] Generate PDF from SOP response data
- [ ] Include all step details
- [ ] Include evidence references
- [ ] Add RCE branding
- [ ] Create export API endpoint
- [ ] Add download button to UI
- [ ] Test PDF generation

## 2.3 Event Engine Upgrade - Status: ⚠️ NEEDS ENHANCEMENTS

### Task 2.3.1: Build Rich Event Timeline
**Files to modify:**
- `src/components/events/event-timeline.tsx` - Enhance timeline
- `src/app/api/events/[id]/timeline/route.ts` - Timeline API

**Timeline Features:**
- Chronological event display
- Event actions (EventAction records)
- Linked SOP responses
- Linked alerts
- Staff member actions
- Status changes
- Resolution details
- Evidence attachments
- Expandable/collapsible sections

**Action Items:**
- [ ] Enhance timeline component with rich details
- [ ] Fetch all related data (actions, SOPs, alerts)
- [ ] Display in chronological order
- [ ] Add visual timeline (vertical line)
- [ ] Add expand/collapse for details
- [ ] Add filtering options
- [ ] Add search functionality
- [ ] Add export option

### Task 2.3.2: Auto-Link SOP Responses to Events
**Files to modify:**
- `src/app/api/sop-responses/route.ts` - Auto-link on creation
- `src/app/api/events/[id]/route.ts` - Show linked SOPs

**Action Items:**
- [ ] When SOP response created from event context, auto-link
- [ ] Update event detail to show linked SOP responses
- [ ] Add manual linking option
- [ ] Add unlinking option
- [ ] Show SOP response status in event view
- [ ] Add "Create SOP Response" button in event view

### Task 2.3.3: Associate Recordings (File References)
**Files to create:**
- `database/migration-010-add-recordings-table.sql` - Recordings table

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Recording" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT,
    "sopResponseId" TEXT,
    "clientId" TEXT NOT NULL,
    "recordingType" TEXT NOT NULL, -- 'video', 'audio', 'screen'
    "fileUrl" TEXT,
    "filePath" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "duration" INTEGER, -- in seconds
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE SET NULL,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE SET NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("recordedBy") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recording_event_id ON "Recording"("eventId");
CREATE INDEX IF NOT EXISTS idx_recording_sop_response_id ON "Recording"("sopResponseId");
CREATE INDEX IF NOT EXISTS idx_recording_client_id ON "Recording"("clientId");
```

**Files to create:**
- `src/app/api/recordings/route.ts` - Recordings API
- `src/components/events/recording-player.tsx` - Recording player

**Action Items:**
- [ ] Create Recordings table migration
- [ ] Create recordings API endpoints
- [ ] Add recording upload functionality
- [ ] Link recordings to events
- [ ] Link recordings to SOP responses
- [ ] Create recording player component
- [ ] Display recordings in event timeline
- [ ] Add recording download option

## 2.4 Assistant (Contextual Version) - Status: ⚠️ NEEDS ENHANCEMENTS

### Task 2.4.1: Enhance Context Payload
**Files to modify:**
- `src/lib/assistant/context-service.ts` - Enhance context payload
- `src/lib/assistant/types.ts` - Update types

**Enhanced Context Payload:**
```typescript
{
  userRole: 'staff' | 'admin',
  module: string,
  client_id?: string,
  event_id?: string,
  sop_id?: string,
  sop_response_id?: string,
  alert_id?: string,
  context: {
    client?: ClientData,
    event?: EventData,
    sop?: SOPData,
    alert?: AlertData
  }
}
```

**Action Items:**
- [ ] Update context types
- [ ] Enhance context service to fetch related data
- [ ] Add client data to context
- [ ] Add event data to context
- [ ] Add SOP data to context
- [ ] Add alert data to context
- [ ] Pass full context to static guidance

### Task 2.4.2: Add Contextual Guidance
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add contextual responses
- `src/lib/assistant/query-handlers.ts` - Add contextual handlers

**Contextual Guidance:**
- Event-specific help
- Client-specific guidance
- SOP-specific explanations
- Alert-specific recommendations
- Next steps suggestions

**Action Items:**
- [ ] Add event context handling
- [ ] Add client context handling
- [ ] Add SOP context handling
- [ ] Add alert context handling
- [ ] Generate contextual responses
- [ ] Test contextual guidance

### Task 2.4.3: Add Event Summaries
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add summary generation
- `src/components/assistant/assistant-drawer.tsx` - Show summaries

**Action Items:**
- [ ] Create event summary generator
- [ ] Include timeline in summary
- [ ] Include linked SOPs in summary
- [ ] Include related alerts in summary
- [ ] Format summary nicely
- [ ] Add "Summarize this event" command
- [ ] Display summary in assistant

### Task 2.4.4: Add SOP Summaries
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add SOP summary
- `src/components/assistant/assistant-drawer.tsx` - Show SOP summaries

**Action Items:**
- [ ] Create SOP summary generator
- [ ] Include step completion status
- [ ] Include notes summary
- [ ] Include evidence list
- [ ] Add "Summarize this SOP" command
- [ ] Display summary in assistant

### Task 2.4.5: Highlight Missing Information
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add missing info detection
- `src/components/assistant/assistant-drawer.tsx` - Show missing info

**Action Items:**
- [ ] Detect missing required fields
- [ ] Detect incomplete steps
- [ ] Detect missing evidence
- [ ] Generate missing info list
- [ ] Add "What's missing?" command
- [ ] Display missing info in assistant
- [ ] Suggest next actions

## 2.5 Sync (Phase 1 — Provider Only) - Status: ❌ NOT STARTED

### Task 2.5.1: Create Synology Folder Structure
**Files to create:**
- `src/lib/sync/synology-client.ts` - Synology API client
- `src/lib/sync/folder-structure.ts` - Folder structure manager

**Folder Structure:**
```
/SupportSense/
  /Clients/
    /{clientId}/
      /Events/
        /{eventId}/
          - event.json
          - sop-responses/
          - recordings/
          - evidence/
      /SOPs/
      /Exports/
```

**Action Items:**
- [ ] Research Synology API (DSM API)
- [ ] Create Synology client wrapper
- [ ] Implement authentication
- [ ] Create folder structure service
- [ ] Auto-create client folders
- [ ] Auto-create event folders
- [ ] Test folder creation

### Task 2.5.2: Create Local Hub for Uploads
**Files to create:**
- `src/lib/sync/local-hub.ts` - Local sync hub
- `src/app/api/sync/upload/route.ts` - Upload endpoint

**Action Items:**
- [ ] Create local hub service
- [ ] Queue events for upload
- [ ] Queue SOP responses for upload
- [ ] Queue recordings for upload
- [ ] Queue evidence for upload
- [ ] Implement upload queue
- [ ] Add retry logic
- [ ] Add status tracking

### Task 2.5.3: Basic Google Drive Mirroring (PDFs Only)
**Files to create:**
- `src/lib/sync/drive-client.ts` - Google Drive API client
- `src/app/api/sync/drive/route.ts` - Drive sync endpoint

**Action Items:**
- [ ] Research Google Drive API
- [ ] Create Drive client wrapper
- [ ] Implement OAuth authentication
- [ ] Create Drive folder structure
- [ ] Upload PDF exports to Drive
- [ ] Mirror folder structure
- [ ] Add sync status tracking
- [ ] Test Drive uploads

---

## Stage 2 Completion Checklist

- [ ] Alert severity logic implemented
- [ ] Quick actions added to dashboard
- [ ] Client tags and risk indicators implemented
- [ ] Evidence attachment system created
- [ ] Step completeness validation added
- [ ] SOP Response PDF export working
- [ ] Rich event timeline implemented
- [ ] Auto-linking SOP responses to events working
- [ ] Recordings table and API created
- [ ] Enhanced contextual assistant working
- [ ] Event and SOP summaries working
- [ ] Missing information detection working
- [ ] Synology folder structure created
- [ ] Local hub for uploads working
- [ ] Google Drive PDF mirroring working
- [ ] End-to-end test: Full workflow from alert to export

---

# STAGE 3 — Intelligence Layer (Gemini + Advanced Assistant)

**Goal:** Add AI-driven understanding of recordings, events, and workflows.

## 3.1 Gemini Notation System (Phase 1) - Status: ❌ NOT STARTED

### Task 3.1.1: Set Up Gemini API Integration
**Files to create:**
- `src/lib/gemini/gemini-client.ts` - Gemini API client
- `src/lib/gemini/config.ts` - Configuration
- `src/app/api/gemini/health/route.ts` - Health check

**Dependencies:**
- Google Gemini API key
- @google/generative-ai package

**Action Items:**
- [ ] Install Gemini SDK
- [ ] Create Gemini client wrapper
- [ ] Set up API key configuration
- [ ] Create health check endpoint
- [ ] Test API connection
- [ ] Add error handling

### Task 3.1.2: Accept A/V Recordings
**Files to create:**
- `src/lib/gemini/recording-processor.ts` - Recording processor
- `src/app/api/gemini/process-recording/route.ts` - Processing endpoint

**Files to modify:**
- `src/app/api/recordings/route.ts` - Trigger processing on upload

**Action Items:**
- [ ] Create recording processor service
- [ ] Accept video files (MP4, MOV, etc.)
- [ ] Accept audio files (MP3, WAV, etc.)
- [ ] Validate file formats
- [ ] Check file size limits
- [ ] Upload to temporary storage
- [ ] Trigger Gemini processing
- [ ] Handle processing errors

### Task 3.1.3: Generate Transcripts
**Files to create:**
- `src/lib/gemini/transcription-service.ts` - Transcription service
- `database/migration-011-add-transcripts-table.sql` - Transcripts table

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Transcript" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "recordingId" TEXT NOT NULL,
    "eventId" TEXT,
    "sopResponseId" TEXT,
    "transcriptText" TEXT NOT NULL,
    "language" TEXT DEFAULT 'en',
    "confidence" FLOAT,
    "processingTime" INTEGER, -- in seconds
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("recordingId") REFERENCES "Recording"(id) ON DELETE CASCADE,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE SET NULL,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transcript_recording_id ON "Transcript"("recordingId");
```

**Action Items:**
- [ ] Create Transcripts table migration
- [ ] Create transcription service
- [ ] Integrate Gemini speech-to-text
- [ ] Generate transcripts from audio/video
- [ ] Store transcripts in database
- [ ] Add confidence scores
- [ ] Add processing time tracking
- [ ] Handle transcription errors

### Task 3.1.4: Produce Basic Tags
**Files to create:**
- `src/lib/gemini/tag-generator.ts` - Tag generation service
- `database/migration-012-add-tags-table.sql` - Tags table

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "NotationTag" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "transcriptId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "tagType" TEXT NOT NULL, -- 'tone', 'motion', 'risk_word', 'keyword'
    "tagValue" TEXT NOT NULL,
    "confidence" FLOAT,
    "timestamp" INTEGER, -- in seconds from start
    "context" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("transcriptId") REFERENCES "Transcript"(id) ON DELETE CASCADE,
    FOREIGN KEY ("recordingId") REFERENCES "Recording"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notation_tag_transcript_id ON "NotationTag"("transcriptId");
CREATE INDEX IF NOT EXISTS idx_notation_tag_recording_id ON "NotationTag"("recordingId");
CREATE INDEX IF NOT EXISTS idx_notation_tag_type ON "NotationTag"("tagType");
```

**Tag Types:**
- Tone: calm, agitated, distressed, etc.
- Motion: movement detected, fall, etc.
- Risk words: medical terms, emergency phrases
- Keywords: important phrases

**Action Items:**
- [ ] Create NotationTag table migration
- [ ] Create tag generator service
- [ ] Use Gemini to analyze transcript
- [ ] Extract tone indicators
- [ ] Extract motion keywords
- [ ] Extract risk words
- [ ] Extract general keywords
- [ ] Store tags with timestamps
- [ ] Add confidence scores

## 3.2 Assistant (Intelligence Version) - Status: ❌ NOT STARTED

### Task 3.2.1: Interpret Gemini Tags
**Files to create:**
- `src/lib/assistant/tag-interpreter.ts` - Tag interpretation service
- `src/lib/assistant/skills/tag-skills.ts` - Tag query handlers

**Action Items:**
- [ ] Create tag interpreter service
- [ ] Analyze tag patterns
- [ ] Generate insights from tags
- [ ] Create tag-based summaries
- [ ] Add tag query handlers
- [ ] Test tag interpretation

### Task 3.2.2: Auto-Summarize Events with Annotations
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add AI summarization
- `src/app/api/events/[id]/summary/route.ts` - Enhance summary endpoint

**Action Items:**
- [ ] Integrate Gemini tags into event summaries
- [ ] Include transcript excerpts
- [ ] Highlight important tags
- [ ] Generate narrative summary
- [ ] Add timestamp references
- [ ] Test auto-summarization

### Task 3.2.3: Recommend Next Actions in SOP
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add action recommendations
- `src/components/sops/sop-response-form.tsx` - Show recommendations

**Action Items:**
- [ ] Analyze current SOP progress
- [ ] Analyze event context
- [ ] Analyze tags and transcripts
- [ ] Generate next step recommendations
- [ ] Display recommendations in UI
- [ ] Add "What should I do next?" command
- [ ] Test recommendations

### Task 3.2.4: Detect Potential Incident Escalation
**Files to create:**
- `src/lib/assistant/escalation-detector.ts` - Escalation detection
- `src/app/api/events/[id]/check-escalation/route.ts` - Escalation check

**Escalation Indicators:**
- High-risk keywords
- Agitated tone
- Multiple risk words
- Medical terminology
- Emergency phrases

**Action Items:**
- [ ] Create escalation detector
- [ ] Analyze tags for escalation indicators
- [ ] Calculate escalation score
- [ ] Generate escalation alerts
- [ ] Notify admin/staff
- [ ] Add escalation flag to events
- [ ] Test escalation detection

### Task 3.2.5: Fill Structured JSON Outputs
**Files to create:**
- `src/lib/assistant/json-filler.ts` - JSON structure filler
- `src/lib/assistant/skills/json-skills.ts` - JSON query handlers

**Action Items:**
- [ ] Create JSON filler service
- [ ] Define output schemas
- [ ] Extract data from context
- [ ] Fill JSON structures
- [ ] Validate JSON output
- [ ] Add JSON export functionality
- [ ] Test JSON generation

## 3.3 Annotation Engine - Status: ❌ NOT STARTED

### Task 3.3.1: Convert Tags to Annotations
**Files to create:**
- `src/lib/annotations/annotation-engine.ts` - Annotation engine
- `database/migration-013-add-annotations-table.sql` - Annotations table

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Annotation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "recordingId" TEXT NOT NULL,
    "eventId" TEXT,
    "sopResponseId" TEXT,
    "annotationType" TEXT NOT NULL, -- 'tag', 'summary', 'highlight', 'note'
    "content" TEXT NOT NULL,
    "startTime" INTEGER, -- in seconds
    "endTime" INTEGER, -- in seconds
    "tags" JSONB, -- Related tags
    "createdBy" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("recordingId") REFERENCES "Recording"(id) ON DELETE CASCADE,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE SET NULL,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_annotation_recording_id ON "Annotation"("recordingId");
CREATE INDEX IF NOT EXISTS idx_annotation_event_id ON "Annotation"("eventId");
```

**Action Items:**
- [ ] Create Annotations table migration
- [ ] Create annotation engine
- [ ] Convert tags to annotations
- [ ] Group related tags
- [ ] Create annotation summaries
- [ ] Store annotations
- [ ] Test annotation conversion

### Task 3.3.2: Time-Align Annotations
**Files to modify:**
- `src/lib/annotations/annotation-engine.ts` - Add time alignment
- `src/components/events/annotation-timeline.tsx` - Timeline component

**Action Items:**
- [ ] Extract timestamps from tags
- [ ] Align annotations to recording timeline
- [ ] Create time-based annotation map
- [ ] Display annotations on timeline
- [ ] Add seek-to-annotation functionality
- [ ] Test time alignment

### Task 3.3.3: Attach Annotations to Events & SOP Steps
**Files to modify:**
- `src/app/api/events/[id]/route.ts` - Include annotations
- `src/app/api/sop-responses/[id]/route.ts` - Include annotations
- `src/components/events/event-timeline.tsx` - Display annotations

**Action Items:**
- [ ] Link annotations to events
- [ ] Link annotations to SOP steps
- [ ] Display annotations in event view
- [ ] Display annotations in SOP view
- [ ] Add annotation filtering
- [ ] Test annotation linking

## 3.4 Sync (Phase 2 — Full Chain) - Status: ❌ NOT STARTED

### Task 3.4.1: Cloud → Synology → Google Drive Sync
**Files to modify:**
- `src/lib/sync/sync-service.ts` - Full sync chain
- `src/app/api/sync/full-sync/route.ts` - Full sync endpoint

**Sync Chain:**
1. Cloud database → Synology (events, SOPs, recordings)
2. Synology → Google Drive (mirror)
3. Verify checksums at each step

**Action Items:**
- [ ] Create full sync service
- [ ] Implement Cloud → Synology sync
- [ ] Implement Synology → Drive sync
- [ ] Add sync queue management
- [ ] Add priority handling
- [ ] Test full sync chain

### Task 3.4.2: Checksum Verification
**Files to create:**
- `src/lib/sync/checksum.ts` - Checksum utilities
- `database/migration-014-add-sync-checksums.sql` - Checksum tracking

**Action Items:**
- [ ] Create checksum utility
- [ ] Calculate file checksums
- [ ] Store checksums in database
- [ ] Verify checksums on sync
- [ ] Detect corruption
- [ ] Add checksum validation endpoint
- [ ] Test checksum verification

### Task 3.4.3: Error Logging & Recovery
**Files to create:**
- `src/lib/sync/error-handler.ts` - Error handling
- `database/migration-015-add-sync-errors.sql` - Error log table

**Action Items:**
- [ ] Create error handler
- [ ] Log sync errors
- [ ] Implement retry logic
- [ ] Add error recovery
- [ ] Notify on persistent errors
- [ ] Create error dashboard
- [ ] Test error handling

---

# STAGE 4 — Compliance & Validator Framework

**Goal:** Staff can't accidentally submit non-compliant records; the system enforces rules.

## 4.1 Validator Engine - Status: ❌ NOT STARTED

### Task 4.1.1: Build Unified Validator API
**Files to create:**
- `src/lib/validation/validator-engine.ts` - Main validator engine
- `src/lib/validation/types.ts` - Validation types
- `src/app/api/validation/validate/route.ts` - Validation API

**Validator Types:**
- RecordValidator
- SOPValidator
- ComplianceValidator
- BillingValidator

**Action Items:**
- [ ] Create validator engine
- [ ] Define validator interface
- [ ] Create validation API
- [ ] Add validation result types
- [ ] Add rule reference system
- [ ] Test validator engine

### Task 4.1.2: Implement RecordValidator
**Files to create:**
- `src/lib/validation/record-validator.ts` - Record validation

**Validation Rules:**
- Required fields present
- Timestamps valid
- Staff ID verified
- Location verified
- Service description complete

**Action Items:**
- [ ] Create RecordValidator class
- [ ] Implement required field checks
- [ ] Implement timestamp validation
- [ ] Implement staff verification
- [ ] Implement location validation
- [ ] Add rule references
- [ ] Test record validation

### Task 4.1.3: Implement SOPValidator
**Files to create:**
- `src/lib/validation/sop-validator.ts` - SOP validation

**Validation Rules:**
- All required steps completed
- Step notes meet requirements
- Evidence attached (if required)
- Timestamps valid
- Staff signature present

**Action Items:**
- [ ] Create SOPValidator class
- [ ] Implement step completion checks
- [ ] Implement notes validation
- [ ] Implement evidence checks
- [ ] Add rule references
- [ ] Test SOP validation

### Task 4.1.4: Implement ComplianceValidator
**Files to create:**
- `src/lib/validation/compliance-validator.ts` - Compliance validation
- `src/lib/validation/oac-rules.ts` - OAC 5123 rules

**OAC 5123 Rules:**
- Documentation requirements
- Timestamp requirements
- Staff qualification requirements
- Service description requirements
- Incident reporting requirements

**Action Items:**
- [ ] Create ComplianceValidator class
- [ ] Define OAC 5123 rules
- [ ] Implement rule checks
- [ ] Add rule references
- [ ] Create rule documentation
- [ ] Test compliance validation

### Task 4.1.5: Attach rule_ref to Failures
**Files to modify:**
- `src/lib/validation/types.ts` - Add rule_ref to errors
- All validators - Include rule references

**Error Format:**
```typescript
{
  field: string,
  message: string,
  rule_ref: 'OAC 5123.0412',
  severity: 'error' | 'warning',
  suggestion?: string
}
```

**Action Items:**
- [ ] Update error types
- [ ] Add rule_ref to all validators
- [ ] Map errors to OAC rules
- [ ] Test rule references

### Task 4.1.6: Blocking vs Non-Blocking Logic
**Files to modify:**
- `src/lib/validation/validator-engine.ts` - Add blocking logic
- `src/lib/validation/types.ts` - Add blocking flag

**Action Items:**
- [ ] Define blocking vs non-blocking rules
- [ ] Implement blocking validation
- [ ] Prevent submission on blocking errors
- [ ] Allow submission with warnings
- [ ] Display blocking errors prominently
- [ ] Test blocking logic

## 4.2 Assistant + Compliance - Status: ❌ NOT STARTED

### Task 4.2.1: Assistant Explains Validator Errors
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add error explanations
- `src/lib/assistant/skills/compliance-skills.ts` - Compliance skills

**Action Items:**
- [ ] Create error explanation service
- [ ] Map errors to explanations
- [ ] Include rule references
- [ ] Add "Why is this invalid?" command
- [ ] Display error explanations
- [ ] Test error explanations

### Task 4.2.2: Provide OAC References
**Files to create:**
- `src/lib/assistant/kb/oac-rules.ts` - OAC rule knowledge base
- `src/app/api/compliance/oac-rules/[ref]/route.ts` - Rule lookup API

**Action Items:**
- [ ] Create OAC rules database
- [ ] Store full rule text
- [ ] Create rule lookup API
- [ ] Link errors to rules
- [ ] Display rule text in assistant
- [ ] Add "Show OAC rule" command
- [ ] Test OAC references

### Task 4.2.3: Suggest Corrective Actions
**Files to modify:**
- `src/lib/assistant/static-guidance.ts` - Add corrective suggestions
- `src/lib/validation/types.ts` - Add suggestions to errors

**Action Items:**
- [ ] Generate corrective suggestions
- [ ] Map errors to fixes
- [ ] Display suggestions in assistant
- [ ] Add "How do I fix this?" command
- [ ] Test suggestions

### Task 4.2.4: Offer Automatic Fixes
**Files to create:**
- `src/lib/validation/auto-fix.ts` - Auto-fix service
- `src/app/api/validation/auto-fix/route.ts` - Auto-fix API

**Action Items:**
- [ ] Identify fixable errors
- [ ] Create auto-fix logic
- [ ] Implement safe fixes
- [ ] Add confirmation for fixes
- [ ] Test auto-fixes

## 4.3 Incident Pipeline (UI + MUI Drafting) - Status: ❌ NOT STARTED

### Task 4.3.1: Auto-Draft MUI
**Files to create:**
- `src/lib/incidents/mui-drafter.ts` - MUI draft generator
- `database/migration-016-add-incidents-table.sql` - Incidents table
- `src/app/api/incidents/drafts/route.ts` - Draft API

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Incident" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL, -- 'MUI', 'UI'
    "status" TEXT DEFAULT 'draft', -- 'draft', 'review', 'finalized', 'locked'
    "draftData" JSONB NOT NULL,
    "finalizedData" JSONB,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_event_id ON "Incident"("eventId");
CREATE INDEX IF NOT EXISTS idx_incident_client_id ON "Incident"("clientId");
CREATE INDEX IF NOT EXISTS idx_incident_status ON "Incident"("status");
```

**Draft Sources:**
- SOP responses
- Gemini annotations
- Timeline
- Validator results

**Action Items:**
- [ ] Create Incidents table migration
- [ ] Create MUI drafter service
- [ ] Extract data from SOP responses
- [ ] Extract data from annotations
- [ ] Extract data from timeline
- [ ] Extract validator results
- [ ] Generate draft JSON
- [ ] Create draft API
- [ ] Test MUI drafting

### Task 4.3.2: Admin Review Workflow
**Files to create:**
- `src/app/admin/incidents/page.tsx` - Incidents management
- `src/components/incidents/incident-review.tsx` - Review component
- `src/app/api/incidents/[id]/review/route.ts` - Review API

**Action Items:**
- [ ] Create incidents management page
- [ ] Create review component
- [ ] Add review API endpoints
- [ ] Implement review workflow
- [ ] Add comments/notes
- [ ] Add approval/rejection
- [ ] Test review workflow

### Task 4.3.3: Finalized Incident Packet + Lock
**Files to create:**
- `src/lib/incidents/incident-finalizer.ts` - Finalization service
- `src/app/api/incidents/[id]/finalize/route.ts` - Finalize API

**Action Items:**
- [ ] Create finalization service
- [ ] Lock incident data
- [ ] Generate final packet
- [ ] Create checksum
- [ ] Store finalized data
- [ ] Prevent further edits
- [ ] Test finalization

## 4.4 Admin Compliance Dashboard - Status: ❌ NOT STARTED

### Task 4.4.1: Provider-Wide Compliance Score
**Files to create:**
- `src/app/admin/compliance/page.tsx` - Compliance dashboard
- `src/components/compliance/compliance-score.tsx` - Score widget
- `src/app/api/admin/compliance/score/route.ts` - Score API

**Action Items:**
- [ ] Create compliance dashboard
- [ ] Calculate compliance score
- [ ] Display score widget
- [ ] Add score breakdown
- [ ] Add historical trends
- [ ] Test score calculation

### Task 4.4.2: Validation History
**Files to create:**
- `src/components/compliance/validation-history.tsx` - History component
- `src/app/api/admin/compliance/validation-history/route.ts` - History API

**Action Items:**
- [ ] Create validation history component
- [ ] Fetch validation history
- [ ] Display history timeline
- [ ] Filter by date/type
- [ ] Show rule violations
- [ ] Test history display

### Task 4.4.3: Incident Overview
**Files to create:**
- `src/components/compliance/incident-overview.tsx` - Incident overview
- `src/app/api/admin/compliance/incidents/route.ts` - Incidents API

**Action Items:**
- [ ] Create incident overview component
- [ ] Fetch all incidents
- [ ] Display incident list
- [ ] Filter by status/type
- [ ] Show incident details
- [ ] Test incident overview

### Task 4.4.4: Exportable Audit Logs
**Files to create:**
- `src/lib/export/audit-log-export.ts` - Audit log exporter
- `src/app/api/admin/compliance/audit-logs/export/route.ts` - Export API

**Action Items:**
- [ ] Create audit log exporter
- [ ] Generate CSV/PDF exports
- [ ] Include all audit data
- [ ] Add date range filtering
- [ ] Add export API
- [ ] Test audit log export

---

# STAGE 5 — Enterprise Layer (Scaling, Training, Multi-Provider)

**Goal:** Scale to many providers with training, analytics, and enterprise correctness.

## 5.1 Multi-Provider Support - Status: ❌ NOT STARTED

### Task 5.1.1: Add Tenant Structure
**Files to create:**
- `database/migration-017-add-tenants-table.sql` - Tenants table
- `src/lib/tenants/tenant-service.ts` - Tenant service

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS "Tenant" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "tenantCode" TEXT UNIQUE NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
```

**Action Items:**
- [ ] Create Tenants table migration
- [ ] Add tenantId to Client and User tables
- [ ] Create tenant service
- [ ] Implement tenant isolation
- [ ] Test tenant separation

### Task 5.1.2: Per-Provider Config
**Files to create:**
- `src/lib/tenants/config-service.ts` - Config service
- `src/app/api/admin/tenants/[id]/config/route.ts` - Config API

**Action Items:**
- [ ] Create config service
- [ ] Store per-tenant configs
- [ ] Create config API
- [ ] Add config UI
- [ ] Test config management

### Task 5.1.3: Secure Data Isolation
**Files to modify:**
- All API routes - Add tenant filtering
- `src/lib/database.ts` - Add tenant context

**Action Items:**
- [ ] Add tenant context to all queries
- [ ] Filter data by tenant
- [ ] Prevent cross-tenant access
- [ ] Add tenant validation
- [ ] Test data isolation

## 5.2 Training & Certification System - Status: ❌ NOT STARTED

### Task 5.2.1: Assistant-Driven Interactive Training
**Files to create:**
- `src/lib/training/training-service.ts` - Training service
- `database/migration-018-add-training-table.sql` - Training table
- `src/app/api/training/route.ts` - Training API

**Action Items:**
- [ ] Create training service
- [ ] Create training modules
- [ ] Integrate with assistant
- [ ] Add interactive exercises
- [ ] Track progress
- [ ] Test training system

### Task 5.2.2: Scenario Simulations
**Files to create:**
- `src/lib/training/scenarios.ts` - Scenario definitions
- `src/components/training/scenario-player.tsx` - Scenario player

**Action Items:**
- [ ] Create scenario definitions
- [ ] Create scenario player
- [ ] Add scenario execution
- [ ] Track scenario completion
- [ ] Test scenarios

### Task 5.2.3: Skill Assessments
**Files to create:**
- `src/lib/training/assessments.ts` - Assessment service
- `database/migration-019-add-assessments-table.sql` - Assessments table

**Action Items:**
- [ ] Create assessment service
- [ ] Create assessment questions
- [ ] Add assessment scoring
- [ ] Track assessment results
- [ ] Test assessments

### Task 5.2.4: Staff Certification Tracking
**Files to create:**
- `database/migration-020-add-certifications-table.sql` - Certifications table
- `src/app/api/staff/certifications/route.ts` - Certifications API

**Action Items:**
- [ ] Create certifications table
- [ ] Track certifications
- [ ] Add certification requirements
- [ ] Create certifications API
- [ ] Display certifications
- [ ] Test certification tracking

## 5.3 Advanced Exports + Reporting - Status: ❌ NOT STARTED

### Task 5.3.1: Customizable Export Builder
**Files to create:**
- `src/components/export/export-builder.tsx` - Export builder UI
- `src/lib/export/export-config.ts` - Export configuration

**Action Items:**
- [ ] Create export builder UI
- [ ] Add field selection
- [ ] Add format selection
- [ ] Add date range selection
- [ ] Save export configurations
- [ ] Test export builder

### Task 5.3.2: Timeline + Annotations Bundle
**Files to modify:**
- `src/lib/export/export-service.ts` - Add timeline export
- `src/lib/export/pdf-generator.ts` - Add annotations to PDF

**Action Items:**
- [ ] Include timeline in exports
- [ ] Include annotations in exports
- [ ] Add annotation summaries
- [ ] Add timeline visualization
- [ ] Test timeline export

### Task 5.3.3: Incident Packet (PDF + JSON + Checksums)
**Files to create:**
- `src/lib/export/incident-packet.ts` - Incident packet generator
- `src/app/api/incidents/[id]/export/route.ts` - Export API

**Action Items:**
- [ ] Create incident packet generator
- [ ] Generate PDF packet
- [ ] Generate JSON packet
- [ ] Calculate checksums
- [ ] Bundle all files
- [ ] Test packet generation

## 5.4 Performance + Security Hardening - Status: ❌ NOT STARTED

### Task 5.4.1: Caching and Load Optimization
**Files to create:**
- `src/lib/cache/cache-service.ts` - Caching service
- `src/lib/cache/redis-client.ts` - Redis client (if using Redis)

**Action Items:**
- [ ] Implement caching layer
- [ ] Cache frequently accessed data
- [ ] Add cache invalidation
- [ ] Optimize database queries
- [ ] Add query result caching
- [ ] Test caching performance

### Task 5.4.2: Large-Scale File Handling
**Files to modify:**
- `src/lib/sync/sync-service.ts` - Optimize file handling
- `src/app/api/recordings/route.ts` - Optimize uploads

**Action Items:**
- [ ] Implement chunked uploads
- [ ] Add streaming for large files
- [ ] Optimize file storage
- [ ] Add file compression
- [ ] Test large file handling

### Task 5.4.3: Immutable Record Storage
**Files to create:**
- `src/lib/storage/immutable-storage.ts` - Immutable storage service
- `database/migration-021-add-immutable-records.sql` - Immutable records table

**Action Items:**
- [ ] Create immutable storage service
- [ ] Implement record versioning
- [ ] Prevent record deletion
- [ ] Add audit trail
- [ ] Test immutable storage

### Task 5.4.4: Full Encryption Pipeline
**Files to create:**
- `src/lib/security/encryption.ts` - Encryption service
- `src/lib/security/key-management.ts` - Key management

**Action Items:**
- [ ] Implement encryption at rest
- [ ] Implement encryption in transit
- [ ] Add key management
- [ ] Encrypt sensitive data
- [ ] Test encryption pipeline

---

## Complete Implementation Checklist

### Stage 1 (MVP Foundations)
- [ ] All tasks completed
- [ ] End-to-end test passed

### Stage 2 (Core Platform)
- [ ] All tasks completed
- [ ] End-to-end test passed

### Stage 3 (Intelligence Layer)
- [ ] All tasks completed
- [ ] End-to-end test passed

### Stage 4 (Compliance & Validators)
- [ ] All tasks completed
- [ ] End-to-end test passed

### Stage 5 (Enterprise Layer)
- [ ] All tasks completed
- [ ] End-to-end test passed

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Planning Complete - Ready for Implementation

