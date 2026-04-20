-- Allow external detection payloads to pin a specific SOP for the resulting alert.
ALTER TABLE "Detection"
ADD COLUMN IF NOT EXISTS "sopId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'detection_sop_id_fkey'
  ) THEN
    ALTER TABLE "Detection"
    ADD CONSTRAINT detection_sop_id_fkey
    FOREIGN KEY ("sopId") REFERENCES "SOP"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_detection_sop_id ON "Detection"("sopId");
