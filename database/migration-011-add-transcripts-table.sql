-- Migration 011: Add Transcript table for storing transcription results
-- This table stores transcripts generated from audio/video recordings

-- Create Transcript table
CREATE TABLE IF NOT EXISTS "Transcript" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "recordingId" TEXT NOT NULL,
    "alertId" TEXT,
    "sopResponseId" TEXT,
    "transcriptText" TEXT NOT NULL,
    "language" TEXT DEFAULT 'en',
    "confidence" FLOAT,
    "processingTime" INTEGER, -- in seconds
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("recordingId") REFERENCES "Recording"(id) ON DELETE CASCADE,
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE SET NULL,
    FOREIGN KEY ("sopResponseId") REFERENCES "SOPResponse"(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcript_recording_id ON "Transcript"("recordingId");
CREATE INDEX IF NOT EXISTS idx_transcript_alert_id ON "Transcript"("alertId");
CREATE INDEX IF NOT EXISTS idx_transcript_sop_response_id ON "Transcript"("sopResponseId");

-- Add trigger for updated_at
CREATE TRIGGER update_transcript_updated_at 
BEFORE UPDATE ON "Transcript" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and fields
COMMENT ON TABLE "Transcript" IS 'Stores transcripts generated from audio/video recordings';
COMMENT ON COLUMN "Transcript"."recordingId" IS 'Recording this transcript belongs to';
COMMENT ON COLUMN "Transcript"."alertId" IS 'Alert this transcript is linked to (via recording)';
COMMENT ON COLUMN "Transcript"."sopResponseId" IS 'SOP response this transcript is linked to (via recording)';
COMMENT ON COLUMN "Transcript"."transcriptText" IS 'Full transcript text';
COMMENT ON COLUMN "Transcript"."language" IS 'Language code (e.g., en, es, fr)';
COMMENT ON COLUMN "Transcript"."confidence" IS 'Overall confidence score (0.0 to 1.0)';
COMMENT ON COLUMN "Transcript"."processingTime" IS 'Time taken to generate transcript in seconds';

