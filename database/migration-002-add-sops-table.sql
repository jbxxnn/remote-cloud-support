-- Migration: Add SOPs (Standard Operating Procedures) table
-- Run this SQL to create the SOPs table

-- Create SOPs table
CREATE TABLE IF NOT EXISTS "SOP" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    "isGlobal" BOOLEAN DEFAULT false,
    "clientId" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sop_event_type ON "SOP"("eventType");
CREATE INDEX IF NOT EXISTS idx_sop_client_id ON "SOP"("clientId");
CREATE INDEX IF NOT EXISTS idx_sop_global ON "SOP"("isGlobal");

-- Create trigger for updated_at
CREATE TRIGGER update_sop_updated_at BEFORE UPDATE ON "SOP" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and fields
COMMENT ON TABLE "SOP" IS 'Standard Operating Procedures for different event types';
COMMENT ON COLUMN "SOP".name IS 'Name of the SOP (e.g., "Fall Detection Response")';
COMMENT ON COLUMN "SOP"."eventType" IS 'Type of event this SOP applies to (e.g., "fall", "intrusion", "medical")';
COMMENT ON COLUMN "SOP".description IS 'Description of when and how to use this SOP';
COMMENT ON COLUMN "SOP".steps IS 'JSON array of steps to follow (e.g., [{"step": 1, "action": "Attempt contact", "details": "Call client phone"}])';
COMMENT ON COLUMN "SOP"."isGlobal" IS 'Whether this SOP applies to all clients (true) or specific client (false)';
COMMENT ON COLUMN "SOP"."clientId" IS 'Client ID if this SOP is client-specific (null if global)';
COMMENT ON COLUMN "SOP"."isActive" IS 'Whether this SOP is currently active and available for use'; 