-- Migration 008: Add ClientTag table for client tags and risk indicators
-- This table allows tagging clients with risk levels, ISP goals, and custom tags

-- Create ClientTag table
CREATE TABLE IF NOT EXISTS "ClientTag" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    tag TEXT NOT NULL,
    "tagType" TEXT NOT NULL, -- 'risk', 'goal', 'custom'
    color TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_tag_client_id ON "ClientTag"("clientId");
CREATE INDEX IF NOT EXISTS idx_client_tag_type ON "ClientTag"("tagType");

-- Add trigger for updated_at (if needed in future)
-- For now, we'll use createdAt only

-- Add comments to document the table and fields
COMMENT ON TABLE "ClientTag" IS 'Tags for clients including risk indicators, ISP goals, and custom tags';
COMMENT ON COLUMN "ClientTag"."clientId" IS 'The client this tag belongs to';
COMMENT ON COLUMN "ClientTag".tag IS 'The tag text/label';
COMMENT ON COLUMN "ClientTag"."tagType" IS 'Type of tag: risk, goal, or custom';
COMMENT ON COLUMN "ClientTag".color IS 'Optional color for the tag (hex code)';

