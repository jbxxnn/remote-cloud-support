# Support Sense WebRTC Migration Implementation Plan

This plan outlines the steps to migrate the Support Sense application from Google Meet to a custom, in-app WebRTC call solution. The goal is to provide a seamless support experience with features like auto-answering for monitoring tablets and direct control over recording and transcription.

## User Review Required

> [!IMPORTANT]
> **Signaling Server Location:** We will build the Socket.io signaling server within a dedicated `/signaling` subdirectory in this repository. This allows for shared environment variables while keeping the realtime logic separate from the Next.js app.
> 
> **Storage Strategy:** We will start with **Supabase Storage**. The implementation will be modular to allow for a future migration to S3/GCS if needed. We will also implement a **30-day retention policy** with auto-delete logic for recordings not linked to an active "Incident".

---

## Proposed Changes

### Phase 0: Preparation & Safety
**Goal:** Ensure we can toggle between Google Meet and WebRTC without breaking production.

- **[MODIFY] [.env.local](file:///Users/apple/Desktop/Project%20Baby/remote-cloud-support/.env.local)**: Add `CALL_PROVIDER=google_meet` (default) and related RTC variables.
- **[NEW] src/lib/config/call-provider.ts**: Create a utility to check the current provider.
- **[MODIFY] Existing Call Logic**: Wrap current Google Meet triggers in a conditional check based on the provider.

---

### Phase 1: Database Schema (Supabase)
**Goal:** Persist call sessions and events in the local database.

- **[NEW] database/migrations/[timestamp]_add_webrtc_tables.sql**: 
    - `CallSession`: Core session data (client, staff, status).
    - `CallParticipant`: Tracks participants (staff vs. tablet).
    - `CallEvent`: Audit log for signaling events (invite, offer, answer, ICE).
    - `CallRecording`: Metadata for stored media and transcript links.
- **[MODIFY] scripts/run-migration.js**: Ensure the new migration can be executed via `npm run db:migrate`.

---

### Phase 2: Signaling Server (Subdirectory)
**Goal:** Create the realtime communication hub.

- **[NEW] /signaling/package.json**: Basic Node.js setup with `socket.io` and `dotenv`.
- **[NEW] /signaling/server.ts**: 
    - Authenticate sockets using the shared `CALL_TOKEN_SECRET`.
    - Manage rooms by `callSessionId`.
    - Relay `offer`, `answer`, and `ice-candidate` events.
- **[NEW] /signaling/Dockerfile**: (Optional) For containerized deployment.

---

### Phase 3: Backend API Development (Next.js)
**Goal:** Provide endpoints for session management and signaling authentication.

- **[NEW] src/app/api/calls/create/route.ts**: Initialize a `CallSession`.
- **[NEW] src/app/api/calls/[id]/token/route.ts**: Generate ephemeral tokens for signaling server auth.
- **[NEW] src/app/api/calls/[id]/event/route.ts**: Log signaling events to `CallEvent`.
- **[NEW] src/app/api/calls/[id]/end/route.ts**: Finalize the session.

---

### Phase 3: Frontend WebRTC Engine
**Goal:** Implement the client-side logic for the call.

- **[NEW] src/lib/webrtc/signaling-client.ts**: Standardize Socket.io communication.
- **[NEW] src/lib/webrtc/peer-connection.ts**: Wrap `RTCPeerConnection` lifecycle (ICE candidates, stream handling).
- **[NEW] src/hooks/use-webrtc-call.ts**: A custom hook to manage call state across components.
- **[NEW] src/components/calls/call-overlay.tsx**: UI for active calls (video/audio controls).

---

### Phase 4: Tablet Monitoring Mode
**Goal:** Enable auto-answer for monitoring devices.

- **[NEW] src/components/staff/monitoring-mode-toggle.tsx**: UI for staff to activate "Monitoring Mode".
- **[MODIFY] src/app/monitoring/page.tsx**: Implement the auto-answer listener using the WebRTC hook.
- **[NEW] src/lib/utils/wake-lock.ts**: Utility to prevent tablet sleep during monitoring sessions.

---

### Phase 5: Recording & Gemini Integration
**Goal:** Automate recording and link to the existing AI pipeline.

- **[NEW] src/lib/webrtc/media-recorder.ts**: Capture local/remote streams as `.webm`.
- **[NEW] src/lib/storage/recordings.ts**: A modular storage wrapper starting with Supabase Storage.
- **[NEW] src/app/api/calls/[id]/recording/upload/route.ts**: Endpoint to receive recording blobs.
- **[NEW] src/app/api/cron/cleanup-recordings/route.ts**: Cron job to enforce the 30-day auto-delete policy.
- **[MODIFY] src/lib/gemini/pipeline.ts**: Update to accept `CallRecording` objects.

---

## Open Questions

1.  **Storage:** Should we use Supabase Storage buckets or an external S3-compatible service for the `.webm` recordings?
2.  **Signaling Server:** Do you want me to write the code for the Node.js signaling server in a subdirectory here (e.g., `/signaling`), or focus only on the Next.js client-side integration for now?

---

## Verification Plan

### Automated Tests
-   **API Tests:** Verify that `/api/calls/create` returns a valid session ID and correct role permissions.
-   **Schema Validation:** Run `db:migrate` and verify table constraints in Supabase.

### Manual Verification
-   **WebRTC Handshake:** Open two browser tabs (Staff and Tablet) and verify signaling completion.
-   **Auto-Answer:** Activate Monitoring Mode on one tab and trigger a call from another; verify video/audio starts without interaction.
-   **Media Flow:** Verify the recording file is created in storage and a transcript is generated in the `Transcript` table.
