-- Migration 016: Add Incidents table for MUI/UI incident reporting
-- This table stores incident drafts and finalized incident reports

-- Create Incident table
CREATE TABLE IF NOT EXISTS "Incident" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "alertId" TEXT NOT NULL, -- References Alert (Event is the same as Alert in this system)
    "clientId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL, -- 'MUI', 'UI'
    "status" TEXT DEFAULT 'draft', -- 'draft', 'review', 'finalized', 'locked'
    "draftData" JSONB NOT NULL,
    "finalizedData" JSONB,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE CASCADE,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE,
    FOREIGN KEY ("reviewedBy") REFERENCES "User"(id) ON DELETE SET NULL,
    FOREIGN KEY ("finalizedBy") REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_alert_id ON "Incident"("alertId");
CREATE INDEX IF NOT EXISTS idx_incident_client_id ON "Incident"("clientId");
CREATE INDEX IF NOT EXISTS idx_incident_status ON "Incident"("status");
CREATE INDEX IF NOT EXISTS idx_incident_type ON "Incident"("incidentType");
CREATE INDEX IF NOT EXISTS idx_incident_created_at ON "Incident"("createdAt");

-- Add trigger for updated_at
CREATE TRIGGER update_incident_updated_at
BEFORE UPDATE ON "Incident"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and fields
COMMENT ON TABLE "Incident" IS 'Stores MUI/UI incident reports and drafts';
COMMENT ON COLUMN "Incident"."alertId" IS 'The alert/event this incident is linked to';
COMMENT ON COLUMN "Incident"."clientId" IS 'The client this incident is for';
COMMENT ON COLUMN "Incident"."incidentType" IS 'Type of incident: MUI (Major Unusual Incident) or UI (Unusual Incident)';
COMMENT ON COLUMN "Incident".status IS 'Status: draft, review, finalized, or locked';
COMMENT ON COLUMN "Incident"."draftData" IS 'JSONB containing the draft incident data';
COMMENT ON COLUMN "Incident"."finalizedData" IS 'JSONB containing the finalized incident data (locked after finalization)';
COMMENT ON COLUMN "Incident"."createdBy" IS 'User who created the incident draft';
COMMENT ON COLUMN "Incident"."reviewedBy" IS 'User who reviewed the incident';
COMMENT ON COLUMN "Incident"."finalizedBy" IS 'User who finalized the incident';
COMMENT ON COLUMN "Incident"."finalizedAt" IS 'Timestamp when incident was finalized and locked';



