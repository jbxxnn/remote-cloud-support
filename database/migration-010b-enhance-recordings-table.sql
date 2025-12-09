-- Migration 010b: Enhance Recording table for Google Meet and processing status
-- This migration adds fields for Google Meet integration and processing status tracking

-- Add source field to track recording source
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
-- Values: 'manual', 'google_meet', 'phone', 'screen'

-- Add Google Meet specific fields
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;

-- Add processing status for Gemini processing
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "processingStatus" TEXT DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'failed'

-- Add index for processing status
CREATE INDEX IF NOT EXISTS idx_recording_processing_status ON "Recording"("processingStatus");
CREATE INDEX IF NOT EXISTS idx_recording_source ON "Recording"("source");

-- Add comments
COMMENT ON COLUMN "Recording"."source" IS 'Source of recording: manual, google_meet, phone, screen';
COMMENT ON COLUMN "Recording"."meetingId" IS 'Google Meet meeting ID (if source is google_meet)';
COMMENT ON COLUMN "Recording"."meetingUrl" IS 'Google Meet meeting URL (if source is google_meet)';
COMMENT ON COLUMN "Recording"."processingStatus" IS 'Status of Gemini processing: pending, processing, completed, failed';

