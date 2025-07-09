-- Migration 004: Enhance Device table with additional fields for admin-flow requirements
-- This migration adds fields needed for comprehensive device management per client

-- Add new columns to Device table
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "aiBehavior" TEXT[];
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "eventTypes" TEXT[];
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "subjectLineMatch" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "homeAssistantEntityId" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "firmwareVersion" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'online';

-- Add comments to document the new fields
COMMENT ON COLUMN "Device"."aiBehavior" IS 'Array of AI behaviors or capabilities (e.g., ["fall", "motion", "door_opened"])';
COMMENT ON COLUMN "Device"."eventTypes" IS 'Array of event types this device can trigger';
COMMENT ON COLUMN "Device"."subjectLineMatch" IS 'Text pattern to match in webhook subject lines for this device';
COMMENT ON COLUMN "Device"."homeAssistantEntityId" IS 'Home Assistant entity ID for this device';
COMMENT ON COLUMN "Device"."description" IS 'Human-readable description of the device';
COMMENT ON COLUMN "Device"."manufacturer" IS 'Device manufacturer name';
COMMENT ON COLUMN "Device"."model" IS 'Device model name';
COMMENT ON COLUMN "Device"."firmwareVersion" IS 'Current firmware version';
COMMENT ON COLUMN "Device"."lastSeen" IS 'Last time device was active or reported status';
COMMENT ON COLUMN "Device"."status" IS 'Current device status (online, offline, error, maintenance)';

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_device_status ON "Device"(status);
CREATE INDEX IF NOT EXISTS idx_device_last_seen ON "Device"("lastSeen");
CREATE INDEX IF NOT EXISTS idx_device_manufacturer ON "Device"(manufacturer);
CREATE INDEX IF NOT EXISTS idx_device_event_types ON "Device" USING GIN("eventTypes");
CREATE INDEX IF NOT EXISTS idx_device_ai_behavior ON "Device" USING GIN("aiBehavior");

-- Update the updated_at trigger to include the new columns
-- (The existing trigger will automatically handle the new columns) 