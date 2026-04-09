-- Create StaffAssignment join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS "StaffAssignment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
    FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
    UNIQUE("userId", "clientId")
);

-- Migrate existing staff assignments
-- Transfer single clientId from User table to StaffAssignment table for staff members
INSERT INTO "StaffAssignment" ("userId", "clientId")
SELECT id, "clientId" 
FROM "User" 
WHERE "clientId" IS NOT NULL AND role = 'staff'
ON CONFLICT DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_staff_assignment_user_id ON "StaffAssignment"("userId");
CREATE INDEX IF NOT EXISTS idx_staff_assignment_client_id ON "StaffAssignment"("clientId");
