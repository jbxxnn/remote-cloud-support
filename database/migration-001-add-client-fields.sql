-- Migration: Add new client fields
-- Run this SQL to add the new fields to existing Client table

-- Add new columns to Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "emergencyServicesNumber" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "serviceProviderId" TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN "Client".address IS 'Full address of the client';
COMMENT ON COLUMN "Client".timezone IS 'Timezone of the client location (e.g., America/New_York)';
COMMENT ON COLUMN "Client"."emergencyContact" IS 'Emergency contact name and phone number';
COMMENT ON COLUMN "Client"."emergencyServicesNumber" IS 'Local emergency services phone number';
COMMENT ON COLUMN "Client"."serviceProviderId" IS 'Assigned service provider ID (if applicable)';

-- Update the updated_at trigger to include the new fields
-- (The existing trigger should already handle this automatically) 