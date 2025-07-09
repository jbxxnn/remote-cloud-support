-- Migration 005: Simplify Device table by removing excess columns
-- This migration removes the complex fields we added and keeps only the essential ones

-- Remove the excess columns that are not needed for simple device creation
ALTER TABLE "Device" DROP COLUMN IF EXISTS "aiBehavior";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "eventTypes";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "subjectLineMatch";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "homeAssistantEntityId";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "description";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "manufacturer";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "model";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "firmwareVersion";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "lastSeen";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "status";

-- Drop the indexes that were created for the removed columns
DROP INDEX IF EXISTS idx_device_status;
DROP INDEX IF EXISTS idx_device_last_seen;
DROP INDEX IF EXISTS idx_device_manufacturer;
DROP INDEX IF EXISTS idx_device_event_types;
DROP INDEX IF EXISTS idx_device_ai_behavior;

-- The Device table now only contains:
-- - id (TEXT PRIMARY KEY)
-- - clientId (TEXT NOT NULL, FOREIGN KEY)
-- - name (TEXT NOT NULL) 
-- - deviceId (TEXT NOT NULL)
-- - location (TEXT)
-- - deviceType (TEXT DEFAULT 'camera')
-- - isActive (BOOLEAN DEFAULT true)
-- - metadata (JSONB)
-- - createdAt (TIMESTAMP)
-- - updatedAt (TIMESTAMP) 