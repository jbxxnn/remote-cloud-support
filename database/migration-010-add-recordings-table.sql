-- Migration 010: Add Recording table for video/audio/screen recordings
-- This table stores recordings linked to alerts and SOP responses

-- Create Recording table
CREATE TABLE IF NOT EXISTS "Recording" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "alertId" TEXT, -- Link to Alert (optional)
    "sopResponseId" TEXT, -- Link to SOP Response (optional)
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
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE SET NULL,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE SET NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("recordedBy") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recording_alert_id ON "Recording"("alertId");
CREATE INDEX IF NOT EXISTS idx_recording_sop_response_id ON "Recording"("sopResponseId");
CREATE INDEX IF NOT EXISTS idx_recording_client_id ON "Recording"("clientId");
CREATE INDEX IF NOT EXISTS idx_recording_type ON "Recording"("recordingType");
CREATE INDEX IF NOT EXISTS idx_recording_recorded_by ON "Recording"("recordedBy");

-- Add comments to document the table and fields
COMMENT ON TABLE "Recording" IS 'Video, audio, and screen recordings linked to alerts and SOP responses';
COMMENT ON COLUMN "Recording"."alertId" IS 'Optional: Alert this recording is linked to';
COMMENT ON COLUMN "Recording"."sopResponseId" IS 'Optional: SOP response this recording is linked to';
COMMENT ON COLUMN "Recording"."clientId" IS 'Client this recording belongs to';
COMMENT ON COLUMN "Recording"."recordingType" IS 'Type of recording: video, audio, or screen';
COMMENT ON COLUMN "Recording"."fileUrl" IS 'URL to access the recording (if stored remotely)';
COMMENT ON COLUMN "Recording"."filePath" IS 'Local file path (if stored locally)';
COMMENT ON COLUMN "Recording"."duration" IS 'Duration of recording in seconds';
COMMENT ON COLUMN "Recording"."recordedBy" IS 'User who created/uploaded the recording';

