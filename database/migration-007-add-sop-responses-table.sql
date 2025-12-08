-- Migration 007: Add SOPResponse table for tracking SOP completion
-- This table tracks when staff members complete SOP steps for alerts

-- Create SOPResponse table
CREATE TABLE IF NOT EXISTS "SOPResponse" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sopId" TEXT NOT NULL,
    "alertId" TEXT, -- Link to Alert (optional - SOP can be completed independently)
    "clientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "completedSteps" JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of completed step objects
    "notes" TEXT,
    "status" TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sopId") REFERENCES "SOP"(id) ON DELETE CASCADE,
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE SET NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("staffId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sop_response_sop_id ON "SOPResponse"("sopId");
CREATE INDEX IF NOT EXISTS idx_sop_response_alert_id ON "SOPResponse"("alertId");
CREATE INDEX IF NOT EXISTS idx_sop_response_client_id ON "SOPResponse"("clientId");
CREATE INDEX IF NOT EXISTS idx_sop_response_staff_id ON "SOPResponse"("staffId");
CREATE INDEX IF NOT EXISTS idx_sop_response_status ON "SOPResponse"("status");
CREATE INDEX IF NOT EXISTS idx_sop_response_started_at ON "SOPResponse"("startedAt");

-- Add trigger for updated_at
CREATE TRIGGER update_sop_response_updated_at 
BEFORE UPDATE ON "SOPResponse" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and fields
COMMENT ON TABLE "SOPResponse" IS 'Tracks staff completion of SOP steps for alerts';
COMMENT ON COLUMN "SOPResponse"."sopId" IS 'The SOP being completed';
COMMENT ON COLUMN "SOPResponse"."alertId" IS 'Optional: Alert this SOP response is linked to';
COMMENT ON COLUMN "SOPResponse"."clientId" IS 'Client this SOP response is for';
COMMENT ON COLUMN "SOPResponse"."staffId" IS 'Staff member completing the SOP';
COMMENT ON COLUMN "SOPResponse"."completedSteps" IS 'JSON array of completed steps: [{"step": 1, "action": "...", "completedAt": "...", "notes": "..."}]';
COMMENT ON COLUMN "SOPResponse"."status" IS 'Status: in_progress, completed, or abandoned';
COMMENT ON COLUMN "SOPResponse"."startedAt" IS 'When the SOP response was started';
COMMENT ON COLUMN "SOPResponse"."completedAt" IS 'When the SOP response was completed (null if in progress)';

