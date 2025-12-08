-- Migration 009: Add Evidence table for SOP response attachments
-- This table stores evidence (photos, files, text notes) attached to SOP responses

-- Create Evidence table
CREATE TABLE IF NOT EXISTS "Evidence" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sopResponseId" TEXT NOT NULL,
    "alertId" TEXT, -- Link to Alert (optional - evidence can be linked to alert directly)
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
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE SET NULL,
    FOREIGN KEY ("uploadedBy") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evidence_sop_response_id ON "Evidence"("sopResponseId");
CREATE INDEX IF NOT EXISTS idx_evidence_alert_id ON "Evidence"("alertId");
CREATE INDEX IF NOT EXISTS idx_evidence_type ON "Evidence"("evidenceType");
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON "Evidence"("uploadedBy");

-- Add comments to document the table and fields
COMMENT ON TABLE "Evidence" IS 'Evidence attachments (photos, files, text notes) for SOP responses';
COMMENT ON COLUMN "Evidence"."sopResponseId" IS 'The SOP response this evidence belongs to';
COMMENT ON COLUMN "Evidence"."alertId" IS 'Optional: Alert this evidence is linked to';
COMMENT ON COLUMN "Evidence"."evidenceType" IS 'Type of evidence: photo, text, file, or recording';
COMMENT ON COLUMN "Evidence"."fileUrl" IS 'URL to access the file (if stored remotely)';
COMMENT ON COLUMN "Evidence"."filePath" IS 'Local file path (if stored locally)';
COMMENT ON COLUMN "Evidence"."fileName" IS 'Original filename';
COMMENT ON COLUMN "Evidence"."mimeType" IS 'MIME type of the file';
COMMENT ON COLUMN "Evidence"."fileSize" IS 'File size in bytes';
COMMENT ON COLUMN "Evidence"."description" IS 'Description or notes about the evidence';
COMMENT ON COLUMN "Evidence"."uploadedBy" IS 'User who uploaded the evidence';

