# System Architecture (Verified)

## 1. Data Ingestion Flow
1.  **Detections**: External devices send Webhooks to `/api/webhooks/detections`. 
2.  **Alerts**: Webhooks create `Detection` records and trigger `Alert` entries.
3.  **Real-time Communication**: Staff initiate WebRTC or Google Meet calls from the Client Detail page.

## 2. Intelligence Loop (SupportSense Assistant)
Our AI system is a multi-stage pipeline:
1.  **Recording**: Calls are recorded (WebRTC locally or Google Meet in Google Drive).
2.  **Ingestion**: `poll:drive` script finds new files in Google Drive.
3.  **Transcription**: `drive-service.ts` extracts AI-summarized notes from Google Doc transcripts.
4.  **Tagging**: `tag-generator.ts` uses Gemini to extract `{tone, motion, risk_word, keyword}`.
5.  **Recomendation**: `sop-recommender.ts` reads these tags to suggest real-time actions during SOP execution.

## 3. Compliance & Incident Workflow
1.  **SOP Validation**: `SOPValidator` checks progress against OAC 5123 rules.
2.  **Evidence**: Photos/files are attached to `SOPResponse` via `EvidenceUpload`.
3.  **Incident Drafting**: `mui-drafter.ts` uses keywords to auto-generate incident reports for review.
4.  **Audit Integrity**: Every action is logged with rule references.

## 4. Logical Component Mapping
- **Identity**: NextAuth (JWT) -> `src/lib/auth.ts`
- **Data Layer**: PostgreSQL -> `src/lib/database.ts`
- **Sync Plane**: Google Drive SDK -> `src/lib/google-drive/`
- **UI System**: Radix UI + Custom Staff Components -> `src/components/staff/`
- **Background Jobs**: TSX Scripts -> `scripts/`
