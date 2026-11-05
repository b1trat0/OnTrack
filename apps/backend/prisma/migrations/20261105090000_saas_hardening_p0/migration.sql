-- Additive P0 hardening migration.
-- 1. The profile endpoint writes avatarUrl, but the column never existed.
-- 2. Agent list queries always filter by userId; Postgres does not index FKs.
-- 3. Appointment has no audit timestamps, so future sync/conflict logic has no
--    "last changed" signal. Existing rows get the migration time.

ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

ALTER TABLE "Appointment"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
