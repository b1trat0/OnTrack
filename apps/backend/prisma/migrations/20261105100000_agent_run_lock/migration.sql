-- Cross-isolate run lock. A running AgentRun holds the agent id; the unique
-- index makes the second concurrent insert fail, which the runner maps to 409.
-- Finished runs clear the key. Stale locks older than 15 minutes are reclaimed
-- by the runner before it creates a new row.

ALTER TABLE "AgentRun" ADD COLUMN "lockKey" TEXT;

CREATE UNIQUE INDEX "AgentRun_lockKey_key" ON "AgentRun"("lockKey");
