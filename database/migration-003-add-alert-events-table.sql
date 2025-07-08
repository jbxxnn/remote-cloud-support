-- Migration 003: Add AlertEvent table for tracking alert workflow
-- This table tracks who handled alerts, when, and what actions were taken

-- Create AlertEvent table
CREATE TABLE IF NOT EXISTS "AlertEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "alertId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL, -- 'acknowledged', 'resolved', 'escalated', 'notes_added', 'reassigned'
    "message" TEXT,
    "metadata" JSONB, -- Additional data like resolution time, notes, escalation reason, etc.
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("alertId") REFERENCES "Alert"(id) ON DELETE CASCADE,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    FOREIGN KEY ("staffId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alert_event_alert_id ON "AlertEvent"("alertId");
CREATE INDEX IF NOT EXISTS idx_alert_event_client_id ON "AlertEvent"("clientId");
CREATE INDEX IF NOT EXISTS idx_alert_event_staff_id ON "AlertEvent"("staffId");
CREATE INDEX IF NOT EXISTS idx_alert_event_type ON "AlertEvent"("eventType");
CREATE INDEX IF NOT EXISTS idx_alert_event_created_at ON "AlertEvent"("createdAt");

-- Add trigger for updated_at
CREATE TRIGGER update_alert_event_updated_at 
BEFORE UPDATE ON "AlertEvent" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add status column to Alert table if it doesn't exist (for tracking workflow state)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Alert' AND column_name = 'status') THEN
        ALTER TABLE "Alert" ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Create index for alert status
CREATE INDEX IF NOT EXISTS idx_alert_status ON "Alert"(status);

-- Add assignedTo column to Alert table for tracking who is handling the alert
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Alert' AND column_name = 'assignedTo') THEN
        ALTER TABLE "Alert" ADD COLUMN "assignedTo" TEXT;
        ALTER TABLE "Alert" ADD CONSTRAINT fk_alert_assigned_to 
            FOREIGN KEY ("assignedTo") REFERENCES "User"(id);
    END IF;
END $$;

-- Create index for assignedTo
CREATE INDEX IF NOT EXISTS idx_alert_assigned_to ON "Alert"("assignedTo"); 