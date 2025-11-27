# RCE SupportSense - Complete Implementation Roadmap

## Overview
This roadmap implements all features from the Developer Instructional document across 9 sprints, transforming the existing basic dashboard into a comprehensive, AI-powered, compliance-aligned remote support platform.

## Current State Assessment
- ✅ Basic Staff & Admin dashboards exist
- ✅ Client, Device, SOP, User management APIs
- ✅ Authentication with role-based access (admin/staff)
- ✅ Database schema with core tables
- ✅ Dark mode CSS variables (no toggle yet)
- ❌ No SupportSense Assistant
- ❌ No Gemini Notation Engine
- ❌ No compliance validation framework
- ❌ No sync architecture
- ❌ No RCE branding/color scheme
- ❌ No 3-column dashboard layouts

---

## Sprint 1: User-Interface Enhancement (Core Experience)

### Objective
Refresh staff and admin dashboards with unified Dark-Mode Control Center design, RCE branding, and embed SupportSense Assistant context hooks.

### Tasks

#### UI-1: Implement RCE Color Scheme & Dark Mode Theme Engine
**Files to modify:**
- `src/app/globals.css` - Add RCE color variables (green, black, white)
- `tailwind.config.ts` - Extend theme with RCE colors
- `src/components/ui/theme-provider.tsx` - Create new theme provider component
- `src/app/layout.tsx` - Integrate theme provider

**Implementation:**
- Define RCE color palette: green (#00FF00 or equivalent), black (#000000), white (#FFFFFF)
- Create CSS variables for light/dark modes
- Ensure all components support theme switching
- Default to dark mode as specified

#### UI-2: Add Persistent Header Bar with RCE Branding
**Files to create:**
- `src/components/layout/header-bar.tsx` - Main header component
- `src/components/layout/rce-logo.tsx` - RCE logo component (RC + E mark)

**Files to modify:**
- `src/app/staff/staff-dashboard.tsx` - Add header bar
- `src/app/admin/admin-dashboard.tsx` - Add header bar
- `src/app/staff/client/[id]/page.tsx` - Add header bar

**Features:**
- Live clock display
- Connection status indicator (green/yellow/red)
- Quick metrics: Active alerts, logged-in staff count, open SOPs
- Dark/Light mode toggle
- Alert tones toggle
- SupportSense Assistant icon (bottom-right or header corner)

#### UI-3: Refactor Staff Dashboard to 3-Column Layout
**Files to modify:**
- `src/app/staff/staff-dashboard.tsx` - Complete redesign

**Layout:**
- Left column: Live Alerts Feed (scrollable cards)
- Center column: Active Clients (grid tiles)
- Right column: System Snapshot (widgets for connectivity, documentation, tasks)

**Features:**
- Animated alert cards on arrival
- Client tiles expand on hover (show ISP goal tags, status timeline)
- System Snapshot auto-refresh every 30 seconds
- Empty state widgets ("All clients stable" instead of blank panes)

#### UI-4: Enhance Sidebar Navigation
**Files to modify:**
- `src/components/ui/staff-sidebar.tsx` - Add collapsible menu with live counters
- `src/components/ui/sidebar.tsx` - Enhance admin sidebar

**Sections:**
- Dashboard
- Active Alerts (with notification badges)
- Clients
- SOP Responses
- Communication Center
- Documentation
- History
- Help & Training

**Features:**
- Micro animations
- Notification badges (red = unacknowledged alert)
- Live counters for each section
- Hover tooltips with SupportSense Assistant shortcuts

#### UI-5: Embed SupportSense Assistant Icon & Context Hooks
**Files to create:**
- `src/components/assistant/assistant-icon.tsx` - Floating assistant icon
- `src/lib/assistant/context-service.ts` - Context payload service

**Files to modify:**
- All dashboard pages - Add assistant icon
- All components - Expose module_id for context recognition

**Implementation:**
- Persistent icon on every page
- Hover shows: "Ask SupportSense about this page"
- Context payload: { module, userRole, client_id?, event_id? }

#### UI-6: Add Micro-Animations & Hover Effects
**Files to create:**
- `src/lib/animations.ts` - Animation utilities

**Files to modify:**
- Alert cards - Slide-in animation
- Client tiles - Expand on hover
- Buttons - Micro interactions
- Status indicators - Pulse animations

#### UI-7: Design Empty State Widgets
**Files to create:**
- `src/components/ui/empty-state.tsx` - Reusable empty state component

**Files to modify:**
- All dashboard sections - Replace blank panes with dynamic summaries

---

## Sprint 2: SupportSense Assistant (Minimal UI - Training Mode)

### Objective
Create a minimal Assistant UI accessible everywhere with context awareness. This is a placeholder that will be wired to AI backend later.

### Tasks

#### AI-1: Implement Assistant Drawer Component (Minimal)
**Files to create:**
- `src/components/assistant/assistant-drawer.tsx` - Right-side drawer component
- `src/components/assistant/assistant-chat.tsx` - Chat interface
- `src/components/assistant/assistant-message.tsx` - Message component
- `src/components/assistant/assistant-input.tsx` - Text area + Send button
- `src/hooks/use-assistant.ts` - React hook for assistant state

**Features:**
- Right-side drawer (slide-in from right)
- Shows "Current module: [Module Name]" at top
- Text area + "Send" button
- Static response: "I'm SupportSense. Training mode only."
- Message history (user messages + static responses)
- Accessible via "Assistant" button in header and other assistant button available

**Note:** No AI backend required. This is a UI placeholder for future integration.

#### AI-2: Create Context Payload Service (Structure Only)
**Files to create:**
- `src/lib/assistant/context-service.ts` - Context management (structure only)
- `src/lib/assistant/types.ts` - TypeScript types

**Context payload structure:**
```typescript
{
  role: 'staff' | 'admin',
  module: string,
  client_id?: string,
  event_id?: string,
  sop_id?: string,
  userRole: string
}
```

**Implementation:**
- Track current module/context
- Display in drawer header
- Store context for future backend integration
- No actual AI processing yet

#### AI-3: Integrate Assistant Button in Header
**Files to modify:**
- `src/components/layout/header-bar.tsx` - Add Assistant button if it doesn't already exist
- All dashboard pages - Ensure header includes Assistant button

**Features:**
- Assistant icon/button in header
- Opens drawer on click
- Context automatically passed to drawer

#### AI-4: Wire Context Detection
**Files to create:**
- `src/lib/assistant/context-detector.ts` - Detect current module/context

**Files to modify:**
- All page components - Expose module_id for context detection
- `src/components/assistant/assistant-drawer.tsx` - Display detected context

**Context detection:**
- Automatically detect current page/module
- Display in drawer: "Current module: Dashboard" (or Client Detail, SOP Response, etc.)
- Store context object for future backend use

#### AI-5: Placeholder for Future Integration
**Files to create (stubs only):**
- `src/lib/assistant/llm-service.ts` - Placeholder (commented: "TODO: Wire to AI backend")
- `src/lib/assistant/query-handlers.ts` - Placeholder (commented: "TODO: Implement query handling")

**Note:** These files are created as placeholders with TODO comments. Actual implementation deferred to later sprint.

#### AI-6: Future Tasks (Deferred)
The following tasks are deferred until AI backend is ready:
- LLM endpoint integration
- Vector store setup
- Knowledge base indexing
- Query translation
- Assistant logging
- Role-specific skills
- Real-time status feedback

**Implementation Note:** All Assistant mentions in other sprints should be interpreted as "Wire context into the Assistant panel + plug into backend later."

---

## Sprint 3: Gemini Notation System

### Objective
Automate A/V recording and AI annotation for communication sessions and SOP responses.

### Tasks

#### GN-1: Enable Auto-Recording for Video/Audio Events
**Files to create:**
- `src/lib/gemini/recording-service.ts` - Recording management
- `src/components/communication/video-recorder.tsx` - Video recording component
- `src/components/communication/audio-recorder.tsx` - Audio recording component
- `src/app/api/gemini/recording/route.ts` - Recording API

**Files to modify:**
- `src/app/staff/client/[id]/page.tsx` - Integrate recording on Start Video/Audio
- Communication components - Bind recording to event_id

**Database migration:**
- `database/migration-008-add-recordings-table.sql` - Recordings table

#### GN-2: Integrate Gemini Notation API
**Files to create:**
- `src/lib/gemini/notation-service.ts` - Gemini API integration
- `src/lib/gemini/types.ts` - TypeScript types
- `src/app/api/gemini/annotate/route.ts` - Annotation API endpoint

**Dependencies:**
- Google Gemini API key
- Media processing library

**Features:**
- Real-time audio/video annotation
- Keyword extraction
- Timestamp generation
- Topic identification

#### GN-3: Store Notation JSON Linked to SOP Response Records
**Files to create:**
- `src/lib/gemini/storage-service.ts` - Storage management
- Database migration: `database/migration-009-add-annotations-table.sql`

**Files to modify:**
- `src/app/api/sops/[id]/route.ts` - Link annotations to SOP responses
- `src/app/api/staff/clients/[id]/route.ts` - Attach annotations to events

**Storage:**
- Provider Synology: Media files
- Cloud: Annotation JSON
- Google Drive: Synced copies

#### GN-4: Build Notation Viewer Panel
**Files to create:**
- `src/components/gemini/notation-viewer.tsx` - Viewer component
- `src/components/gemini/notation-player.tsx` - Time-synced playback
- `src/app/api/gemini/notations/[id]/route.ts` - Fetch notation API

**Features:**
- Time-synced playback
- Annotation highlights
- Keyword search
- Export functionality

#### GN-5: Add Gemini Keywords → MUI/UI Taxonomy Mapping
**Files to create:**
- `src/lib/gemini/keyword-mapper.ts` - Keyword to incident type mapping
- `src/lib/gemini/taxonomy.ts` - MUI/UI taxonomy definitions

**Mapping examples:**
- "fall", "fell" → MUI type: Fall
- "agitated", "yell" → UI type: Behavioral
- "medical", "injury" → MUI type: Medical

#### GN-6: Attach Annotation Summaries to Billing Exports
**Files to modify:**
- `src/lib/export/billing-exporter.ts` - Add annotation summaries
- Export PDF/CSV generation - Include annotation table

#### GN-7: Assistant Integration for Annotation Summaries
**Files to create:**
- `src/lib/assistant/skills/annotation-skills.ts` - Annotation query handling (placeholder)

**Files to modify:**
- `src/lib/assistant/query-handlers.ts` - Add annotation summary queries (when backend ready)

**Note:** Wire context into Assistant panel for annotation queries. Backend integration deferred.

---

## Sprint 4: Validation & Compliance Framework

### Objective
Enforce OAC 5123 documentation fields and automate real-time rule checks.

### Tasks

#### VC-1: Build Validator Modules
**Files to create:**
- `src/lib/validation/record-validator.ts` - Record validation
- `src/lib/validation/sop-validator.ts` - SOP validation
- `src/lib/validation/billing-validator.ts` - Billing validation
- `src/lib/validation/compliance-validator.ts` - Compliance validation
- `src/lib/validation/types.ts` - Validation types
- `src/lib/validation/oac-rules.ts` - OAC 5123 rule definitions

**Database migration:**
- `database/migration-010-add-validation-logs.sql` - Validation audit log

**Validation rules:**
- Required fields check
- Timestamp validation
- Staff ID verification
- Location verification
- Service description completeness

#### VC-2: Embed Rule Reference Metadata
**Files to modify:**
- All validators - Return error objects with rule_reference field
- `src/lib/validation/types.ts` - Add rule_ref to error types

**Error format:**
```typescript
{
  field: string,
  message: string,
  rule_ref: 'OAC 5123.0412',
  severity: 'error' | 'warning'
}
```

#### VC-3: Add Real-Time Validation Triggers
**Files to create:**
- `src/hooks/use-validation.ts` - React hook for real-time validation
- `src/components/forms/validated-form.tsx` - Form wrapper with validation

**Files to modify:**
- SOP response forms - Add real-time validation
- Record submission forms - Validate before submit

#### VC-4: Assistant Integration for Violation Explanations
**Files to create:**
- `src/lib/assistant/skills/compliance-skills.ts` - Compliance guidance (placeholder)

**Files to modify:**
- `src/lib/assistant/query-handlers.ts` - Add compliance queries (when backend ready)
- `src/lib/assistant/kb/oac-rules.ts` - Full OAC rule index (for future use)

**Features (when backend ready):**
- Explain violations with rule citations
- Suggest corrections
- Link to full rule text

**Note:** Wire context into Assistant panel for compliance queries. Backend integration deferred.

#### VC-5: Develop Compliance Dashboard
**Files to create:**
- `src/app/admin/compliance/page.tsx` - Compliance dashboard page
- `src/components/compliance/compliance-dashboard.tsx` - Main component
- `src/components/compliance/completion-gauge.tsx` - Completion rate widget
- `src/components/compliance/violations-list.tsx` - Violations widget
- `src/components/compliance/annotation-index.tsx` - Annotation evidence widget
- `src/app/api/admin/compliance/route.ts` - Compliance API

**Features:**
- Completion rate gauge
- Rule violations list (grouped by OAC section)
- Annotation evidence index
- Assistant integration for queries (wire context, backend later)

#### VC-6: Cache Rule Index Locally
**Files to create:**
- `src/lib/validation/rule-cache.ts` - Local rule caching
- `src/lib/validation/cache-sync.ts` - Cache synchronization

**Features:**
- Offline validation support
- Fast rule lookups
- Periodic cache updates

---

## Sprint 5: Synchronization and Audit Integrity

### Objective
Strengthen Cloud ↔ Synology ↔ Drive sync chain and standardize auditing.

### Tasks

#### SY-1: Implement Transaction-Based Sync
**Files to create:**
- `src/lib/sync/sync-service.ts` - Main sync service
- `src/lib/sync/sync-queue.ts` - Transaction queue
- `src/lib/sync/checksum.ts` - Checksum utilities
- `src/lib/sync/synology-client.ts` - Synology API client
- `src/lib/sync/drive-client.ts` - Google Drive API client
- `src/app/api/sync/route.ts` - Sync API endpoint
- `src/app/api/sync/status/route.ts` - Sync status API

**Database migration:**
- `database/migration-011-add-sync-queue.sql` - Sync queue table
- `database/migration-012-add-sync-logs.sql` - Sync audit log

**Features:**
- Transaction-based sync with acknowledgment flags
- Checksum validation per file
- Retry logic
- Conflict resolution

#### SY-2: Expose Sync Status API
**Files to create:**
- `src/app/api/sync/status/route.ts` - Status endpoint
- `src/lib/sync/status-service.ts` - Status calculation

**Status values:**
- Green = Synced
- Yellow = Pending
- Red = Error

#### SY-3: Add Auto-Retry Logic with Email Alerts
**Files to create:**
- `src/lib/sync/retry-handler.ts` - Retry logic
- `src/lib/notifications/email-service.ts` - Email notifications
- `src/lib/sync/alert-service.ts` - Alert management

**Configuration:**
- 3 retry attempts
- 15-minute intervals
- Email Admin after 30 minutes of failure

#### SY-4: Integrate Audit Log Service
**Files to create:**
- `src/lib/audit/audit-service.ts` - Centralized audit service
- `src/lib/audit/types.ts` - Audit types
- `src/app/api/audit/route.ts` - Audit API
- Database migration: `database/migration-013-add-audit-log.sql`

**Audit schema:**
- log_id, timestamp, user_id, module, action, rule_ref?, result, checksum

**Files to modify:**
- All API routes - Add audit logging
- All database operations - Log changes

#### SY-5: Assistant Command Support for Sync
**Files to create:**
- `src/lib/assistant/skills/sync-skills.ts` - Sync queries (placeholder)

**Commands (when backend ready):**
- "Show sync errors"
- "List unsynced records"
- "Explain sync status"
- "Restart sync"

**Note:** Wire context into Assistant panel for sync queries. Backend integration deferred.

#### SY-6: Add Read-Only Audit Trail Viewer
**Files to create:**
- `src/app/admin/audit/page.tsx` - Audit viewer page
- `src/components/audit/audit-viewer.tsx` - Viewer component
- `src/components/audit/audit-timeline.tsx` - Timeline visualization
- `src/app/api/audit/export/route.ts` - Export audit trail

**Features:**
- Filter by user, module, date range
- Chronological timeline
- Export to read-only format
- Immutable record display

---

## Sprint 6: Export & Reporting System

### Objective
Modernize export process and include Gemini annotation summaries.

### Tasks

#### EX-1: Rebuild Export Builder Wizard
**Files to create:**
- `src/app/admin/exports/page.tsx` - Export page
- `src/components/export/export-wizard.tsx` - 3-step wizard
- `src/components/export/step1-selection.tsx` - Client/month selection
- `src/components/export/step2-review.tsx` - Summary review
- `src/components/export/step3-generation.tsx` - Generation progress
- `src/lib/export/export-service.ts` - Export logic
- `src/app/api/admin/exports/route.ts` - Export API

**Wizard steps:**
1. Select client(s) / month / service type
2. Review summary counts
3. Generate pack (PDF + CSV + checksum)

#### EX-2: Integrate Annotation Summaries
**Files to create:**
- `src/lib/export/pdf-generator.ts` - PDF generation with annotations
- `src/lib/export/csv-generator.ts` - CSV generation with annotations
- `src/lib/export/annotation-formatter.ts` - Format annotations for export

**Files to modify:**
- `src/lib/export/export-service.ts` - Include annotation summaries
- Export templates - Add annotation table section

**Features:**
- Optional "Attach notation summaries" toggle
- Condensed annotation table in PDF
- Auto-embed annotation index link

#### EX-3: Assistant Validation Step
**Files to create:**
- `src/lib/assistant/skills/export-skills.ts` - Export validation queries (placeholder)

**Files to modify:**
- `src/components/export/export-wizard.tsx` - Add Assistant validation step (wire context)

**Commands (when backend ready):**
- "What fields are required for billing exports?"
- "Validate records before export"
- "Check export readiness"

**Note:** Wire context into Assistant panel for export validation. Backend integration deferred.

#### EX-4: Generate Compliance Exception Report
**Files to create:**
- `src/lib/export/compliance-report.ts` - Compliance exception report
- `src/components/export/compliance-summary.tsx` - Summary component

**Files to modify:**
- `src/lib/export/export-service.ts` - Include compliance report

---

## Sprint 7: Incident Automation (MUI/UI)

### Objective
Utilize Gemini notation tags for auto-creation of incident drafts.

### Tasks

#### IN-1: Develop Keyword Detection Service
**Files to create:**
- `src/lib/incidents/keyword-detector.ts` - Keyword detection
- `src/lib/incidents/keyword-patterns.ts` - Pattern matching
- `src/lib/incidents/types.ts` - Incident types

**Integration:**
- Listen to Gemini notation stream
- Extract keywords in real-time
- Match against MUI/UI taxonomy

#### IN-2: Auto-Populate MUI Draft
**Files to create:**
- `src/lib/incidents/draft-generator.ts` - Draft creation
- `src/app/api/incidents/drafts/route.ts` - Draft API
- Database migration: `database/migration-014-add-incidents-table.sql`

**Files to modify:**
- `src/lib/gemini/notation-service.ts` - Trigger draft creation on keyword match

**Draft fields:**
- Incident type (from keyword mapping)
- Date/time (from notation timestamp)
- Related record ID
- Notation context
- Suggested fields pre-filled

#### IN-3: Add Assistant Confirmation Prompt
**Files to create:**
- `src/components/incidents/draft-confirmation.tsx` - Confirmation modal
- `src/lib/assistant/skills/incident-skills.ts` - Incident guidance (placeholder)

**Features:**
- Assistant asks: "Confirm incident type" (when backend ready)
- Shows suggested fields
- Allows editing before approval

**Note:** Wire context into Assistant panel for incident confirmation. Backend integration deferred.

#### IN-4: Link Approved Drafts to Incident Module
**Files to create:**
- `src/app/admin/incidents/page.tsx` - Incidents page
- `src/components/incidents/incident-management.tsx` - Management component
- `src/app/api/incidents/route.ts` - Incident API

**Files to modify:**
- `src/lib/incidents/draft-generator.ts` - Move to incident module on approval

**Status workflow:**
- New → Investigating → Closed
- Color-coded status bars

#### IN-5: Train Classification Model
**Files to create:**
- `src/lib/incidents/classification-model.ts` - ML model
- `src/lib/incidents/training-data.ts` - Training data collection

**Note:** This is a low-priority task for future enhancement.

---

## Sprint 8: Performance & Monitoring

### Objective
Benchmark and optimize system latency and reliability.

### Tasks

#### PM-1: Implement Centralized Metrics Collector
**Files to create:**
- `src/lib/metrics/metrics-service.ts` - Metrics collection
- `src/lib/metrics/types.ts` - Metrics types
- `src/app/api/metrics/route.ts` - Metrics API
- Database migration: `database/migration-015-add-metrics-table.sql`

**Metrics:**
- API response times
- Sync latency
- Assistant response time
- Gemini annotation time
- Validation latency

#### PM-2: Add Real-Time Metrics Panel
**Files to create:**
- `src/app/admin/metrics/page.tsx` - Metrics dashboard
- `src/components/metrics/metrics-panel.tsx` - Metrics visualization
- `src/components/metrics/latency-chart.tsx` - Latency charts

**Features:**
- Real-time metrics display
- Historical trends
- Alert thresholds visualization

#### PM-3: Set Alert Thresholds
**Files to create:**
- `src/lib/metrics/alert-thresholds.ts` - Threshold definitions
- `src/lib/metrics/alert-service.ts` - Alert triggering

**Thresholds:**
- Assistant response: < 1s
- Gemini notation: < 2 min video / < 60s audio
- Sync latency: < 5 min
- Validation: < 500ms

#### PM-4: Nightly Performance Report
**Files to create:**
- `src/lib/metrics/report-generator.ts` - Report generation
- `src/lib/metrics/scheduled-reports.ts` - Scheduled job

**Files to modify:**
- `src/lib/notifications/email-service.ts` - Send reports

---

## Sprint 9: Knowledge Base & Learning Mode

### Objective
Keep SupportSense Assistant self-improving and training-aware.

### Tasks

#### KB-1: Add Admin Upload Interface
**Files to create:**
- `src/app/admin/knowledge-base/page.tsx` - Knowledge base page
- `src/components/knowledge-base/upload-interface.tsx` - Upload component
- `src/app/api/admin/knowledge-base/upload/route.ts` - Upload API

**Features:**
- Upload training materials
- Upload policy updates
- Document versioning
- Preview before indexing

#### KB-2: Auto-Index New Documents
**Files to create:**
- `src/lib/assistant/kb/indexer.ts` - Document indexing (placeholder)
- `src/lib/assistant/kb/processor.ts` - Document processing (placeholder)

**Files to modify:**
- `src/lib/assistant/vector-store.ts` - Update on new documents (when backend ready)

**Process (when backend ready):**
- Extract text from documents
- Chunk for vector storage
- Update vector database
- Notify Assistant of new content

**Note:** Structure in place, backend integration deferred.

#### KB-3: Enable Voice Query Mode
**Files to create:**
- `src/components/assistant/voice-input.tsx` - Voice input component
- `src/lib/assistant/voice-service.ts` - Speech-to-text integration

**Dependencies:**
- Web Speech API or cloud speech service
- Voice command processing

#### KB-4: Track Frequent Questions
**Files to create:**
- `src/lib/assistant/analytics/question-tracker.ts` - Question analytics
- `src/app/api/admin/assistant/analytics/route.ts` - Analytics API

**Features:**
- Identify common questions
- Generate training updates
- Suggest knowledge base improvements

#### KB-5: Allow Admin Response Editing
**Files to create:**
- `src/components/knowledge-base/response-editor.tsx` - Editor component
- `src/app/api/admin/knowledge-base/responses/route.ts` - Response management API

**Features:**
- Edit Assistant responses for clarity (when backend ready)
- Version control
- A/B testing different responses

---

## Database Migrations Summary

All migrations to be created:
1. `migration-007-add-assistant-logs.sql` - Assistant query logs (deferred until backend)
2. `migration-008-add-recordings-table.sql` - Media recordings
3. `migration-009-add-annotations-table.sql` - Gemini annotations
4. `migration-010-add-validation-logs.sql` - Validation audit
5. `migration-011-add-sync-queue.sql` - Sync queue
6. `migration-012-add-sync-logs.sql` - Sync audit
7. `migration-013-add-audit-log.sql` - Centralized audit log
8. `migration-014-add-incidents-table.sql` - MUI/UI incidents
9. `migration-015-add-metrics-table.sql` - Performance metrics

---

## Dependencies & Integration Points

### External Services Required
1. **LLM Provider** - For SupportSense Assistant (OpenAI, Anthropic, or self-hosted) - **Deferred**
2. **Vector Database** - For knowledge base (Pinecone, Weaviate, or ChromaDB) - **Deferred**
3. **Google Gemini API** - For notation engine
4. **Google Drive API** - For cloud sync
5. **Synology API** - For local storage sync
6. **Email Service** - For notifications (SendGrid, AWS SES, etc.)

### Environment Variables Needed
```env
# LLM (Deferred)
# LLM_API_KEY=
# LLM_PROVIDER=openai|anthropic|custom
# LLM_MODEL=

# Vector Store (Deferred)
# VECTOR_DB_URL=
# VECTOR_DB_API_KEY=

# Gemini
GEMINI_API_KEY=

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=

# Synology
SYNOLOGY_URL=
SYNOLOGY_USERNAME=
SYNOLOGY_PASSWORD=

# Email
EMAIL_SERVICE_API_KEY=
EMAIL_FROM_ADDRESS=
```

---

## Testing Strategy

### Unit Tests
- Validator modules
- Sync service
- Assistant query translation (when backend ready)
- Gemini keyword mapping

### Integration Tests
- SOP → Gemini → Export flow
- Assistant context accuracy (UI only for now)
- Sync chain integrity
- Compliance validation end-to-end

### Compliance Tests
- OAC 5123 documentation requirements
- Validation rule accuracy
- Audit trail completeness

### Load Tests
- Concurrent staff sessions
- Assistant query load (when backend ready)
- Annotation throughput
- Export batch processing

---

## Implementation Phases

### Phase 1: Foundation (Sprints 1-2)
- UI enhancements
- Assistant minimal UI (training mode)
- **Goal:** Visible UX improvement + Assistant placeholder

### Phase 2: AI Documentation (Sprints 3-4)
- Gemini notation
- Compliance validation
- **Goal:** AI-powered documentation

### Phase 3: Data Integrity (Sprints 5-6)
- Sync architecture
- Export system
- **Goal:** Reliable data chain

### Phase 4: Automation (Sprints 7-8)
- Incident automation
- Performance monitoring
- **Goal:** Operational resilience

### Phase 5: Learning (Sprint 9)
- Knowledge base
- Self-improvement
- **Goal:** Self-sustaining training ecosystem (structure ready, backend deferred)

---

## Success Criteria

- Functional Pass Rate: ≥ 98%
- Compliance Accuracy: ≥ 99%
- Annotation Accuracy: ≥ 95%
- Sync Latency: ≤ 1s average
- Export Reliability: 100% verified checksum
- Assistant Response Time: ≤ 1s (when backend ready)
- Gemini Notation Return: ≤ 2 min video / ≤ 60s audio

---

## Important Notes

### Assistant Implementation Strategy
- **Sprint 2:** Build minimal UI drawer with static responses
- **All Future Sprints:** Wire context into Assistant panel
- **Backend Integration:** Deferred until AI infrastructure is ready
- **Context Detection:** Implemented immediately for all modules
- **All Assistant mentions:** Interpret as "Wire context into Assistant panel + plug into backend later"

### General Implementation Notes
- All components must expose `module_id` for Assistant context
- All API routes must include audit logging
- All sync operations must include checksum verification
- All validations must include OAC rule references
- Dark mode is default; light mode is optional toggle
- RCE color scheme (green, black, white) must be consistent across all UI
- SupportSense Assistant UI is read-only placeholder; no data writes from Assistant layer until backend is integrated

### Development Priorities
1. **High Priority:** UI enhancements, Assistant UI placeholder, Gemini integration, Compliance validation
2. **Medium Priority:** Sync architecture, Export system, Incident automation
3. **Low Priority:** Performance monitoring, Knowledge base backend, Voice queries

---

## Roadmap Version
**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Planning Phase

