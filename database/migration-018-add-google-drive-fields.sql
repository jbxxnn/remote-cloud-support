-- Migration 018: Add Google Drive integration fields
-- This migration adds fields for tracking Google Drive file IDs and transcript sources

-- Add Google Drive file ID fields to Recording table
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "videoDriveFileId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "transcriptDriveFileId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT;

-- Add transcript source field to Transcript table
ALTER TABLE "Transcript" ADD COLUMN IF NOT EXISTS "transcriptSource" TEXT DEFAULT 'speech_to_text';
-- Values: 'google_meet', 'manual', 'speech_to_text'
ALTER TABLE "Transcript" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recording_video_drive_file_id ON "Recording"("videoDriveFileId");
CREATE INDEX IF NOT EXISTS idx_recording_transcript_drive_file_id ON "Recording"("transcriptDriveFileId");
CREATE INDEX IF NOT EXISTS idx_recording_calendar_event_id ON "Recording"("calendarEventId");
CREATE INDEX IF NOT EXISTS idx_transcript_source ON "Transcript"("transcriptSource");
CREATE INDEX IF NOT EXISTS idx_transcript_drive_file_id ON "Transcript"("driveFileId");

-- Add comments
COMMENT ON COLUMN "Recording"."videoDriveFileId" IS 'Google Drive file ID for the video recording';
COMMENT ON COLUMN "Recording"."transcriptDriveFileId" IS 'Google Drive file ID for the transcript Google Doc';
COMMENT ON COLUMN "Recording"."calendarEventId" IS 'Google Calendar event ID (if meeting was created via Calendar API)';
COMMENT ON COLUMN "Transcript"."transcriptSource" IS 'Source of transcript: google_meet, manual, speech_to_text';
COMMENT ON COLUMN "Transcript"."driveFileId" IS 'Google Drive file ID if transcript came from Drive';

