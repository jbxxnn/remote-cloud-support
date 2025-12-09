-- Migration 012: Add NotationTag table for storing AI-generated tags from transcripts
-- This table stores tags extracted by Gemini from transcript analysis

-- Create NotationTag table
CREATE TABLE IF NOT EXISTS "NotationTag" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "transcriptId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "tagType" TEXT NOT NULL, -- 'tone', 'motion', 'risk_word', 'keyword'
    "tagValue" TEXT NOT NULL,
    "confidence" FLOAT,
    "timestamp" INTEGER, -- in seconds from start (optional, for time-aligned tags)
    "context" TEXT, -- Additional context about the tag
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("transcriptId") REFERENCES "Transcript"(id) ON DELETE CASCADE,
    FOREIGN KEY ("recordingId") REFERENCES "Recording"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notation_tag_transcript_id ON "NotationTag"("transcriptId");
CREATE INDEX IF NOT EXISTS idx_notation_tag_recording_id ON "NotationTag"("recordingId");
CREATE INDEX IF NOT EXISTS idx_notation_tag_type ON "NotationTag"("tagType");
CREATE INDEX IF NOT EXISTS idx_notation_tag_timestamp ON "NotationTag"("timestamp");

-- Add trigger for updated_at (if needed in future)
-- Note: Tags are typically immutable, but we can add this if needed

-- Add comments to document the table and fields
COMMENT ON TABLE "NotationTag" IS 'Stores AI-generated tags extracted from transcripts using Gemini';
COMMENT ON COLUMN "NotationTag"."transcriptId" IS 'Transcript this tag belongs to';
COMMENT ON COLUMN "NotationTag"."recordingId" IS 'Recording this tag belongs to (for quick lookup)';
COMMENT ON COLUMN "NotationTag"."tagType" IS 'Type of tag: tone, motion, risk_word, keyword';
COMMENT ON COLUMN "NotationTag"."tagValue" IS 'The actual tag value (e.g., "calm", "agitated", "fall", "emergency")';
COMMENT ON COLUMN "NotationTag"."confidence" IS 'Confidence score (0.0 to 1.0) from Gemini analysis';
COMMENT ON COLUMN "NotationTag"."timestamp" IS 'Timestamp in seconds from recording start (optional, for time-aligned tags)';
COMMENT ON COLUMN "NotationTag"."context" IS 'Additional context or explanation about the tag';

