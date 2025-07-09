-- Migration 006: Allow clientId to be nullable in Device table
-- Since devices are global and not tied to specific clients

-- Make clientId nullable
ALTER TABLE "Device" ALTER COLUMN "clientId" DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN "Device"."clientId" IS 'Client ID (nullable) - devices can be global or assigned to specific clients'; 

ALTER TABLE "Device" DROP COLUMN IF EXISTS "clientId";