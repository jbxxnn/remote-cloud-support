-- Ensure only one SOPResponse per alert+sop (when alertId is set)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sopresponse_alert_sop_unique
ON "SOPResponse" ("alertId", "sopId")
WHERE "alertId" IS NOT NULL;


