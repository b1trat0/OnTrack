import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const agentsPageSource = await readFile('apps/web/src/features/agents/AgentsPage.tsx', 'utf8')
const runHistorySource = await readFile('apps/web/src/features/agents/RunHistory.tsx', 'utf8')
const agentsRepositorySource = await readFile(
  'apps/web/src/global/repositories/agents.repository.ts',
  'utf8'
)
const agentsStoreSource = await readFile('apps/web/src/global/stores/useAgentsStore.ts', 'utf8')
const notesStoreSource = await readFile('apps/web/src/global/stores/useNotesStore.ts', 'utf8')
const messagesStoreSource = await readFile(
  'apps/web/src/global/stores/useAgentMessagesStore.ts',
  'utf8'
)
const diaryPageSource = await readFile('apps/web/src/features/diary/DiaryEntryPage.tsx', 'utf8')
const editorSource = await readFile('apps/web/src/features/agents/AgentEditor.tsx', 'utf8')
const authServiceSource = await readFile('apps/backend/src/services/auth.service.ts', 'utf8')
const agentsServiceSource = await readFile('apps/backend/src/services/agents.service.ts', 'utf8')
const runnerSource = await readFile('apps/backend/src/services/agent.runner.ts', 'utf8')
const agentsControllerSource = await readFile(
  'apps/backend/src/controllers/agents.controller.ts',
  'utf8'
)
const messagesServiceSource = await readFile('apps/backend/src/services/messages.service.ts', 'utf8')
const messagesRepositorySource = await readFile(
  'apps/web/src/global/repositories/messages.repository.ts',
  'utf8'
)
const schemaSource = await readFile('apps/backend/prisma/schema.prisma', 'utf8')
const lockMigrationSource = await readFile(
  'apps/backend/prisma/migrations/20261105100000_agent_run_lock/migration.sql',
  'utf8'
)

test('run history uses the envelope response and is mounted', () => {
  assert.match(agentsRepositorySource, /AgentRunListDto/)
  assert.match(agentsRepositorySource, /runs: AgentRunDto\[\]/)
  assert.match(runHistorySource, /data\.runs/)
  assert.match(agentsPageSource, /<RunHistory agentId=\{historyId\}/)
  assert.match(agentsPageSource, /setHistoryId\(agent\.id\)/)
})

test('agent loading no longer refetches tools per agent', () => {
  assert.doesNotMatch(agentsStoreSource, /listAgentTools/)
  assert.match(agentsStoreSource, /dtos\.map\(toAgent\)/)
})

test('load failures settle the status even when the epoch moved', () => {
  for (const source of [notesStoreSource, agentsStoreSource, messagesStoreSource]) {
    assert.match(source, /finally \{[\s\S]{0,160}?get\(\)\.epoch !==/)
    assert.match(source, /set\(\{ loadStatus: 'idle' \}\)/)
  }
})

test('the diary editor loads and rehydrates the server copy', () => {
  assert.match(diaryPageSource, /void ensureLoaded\(\)/)
  assert.match(diaryPageSource, /setContent\(entry\.content\)/)
  assert.match(diaryPageSource, /\[entry\?\.id, entry\?\.updatedAt\]/)
})

test('the fake token billing copy is gone', () => {
  assert.doesNotMatch(editorSource, /100K tokens\/day/)
  assert.match(editorSource, /Your provider bills those tokens directly/)
})

test('verification and reset tokens are stored as digests', () => {
  assert.match(authServiceSource, /const rawToken = randomToken\(\)/)
  assert.match(authServiceSource, /const token = await digestToken\(rawToken\)/)
  assert.match(authServiceSource, /findUnique\(\{ where: \{ token: digest \} \}\)/)
  assert.match(authServiceSource, /sendVerificationMail\([\s\S]{0,120}?token: rawToken/)
  assert.match(authServiceSource, /sendResetMail\([\s\S]{0,120}?token: rawToken/)
})

test('model keys are checked against the caller before use', () => {
  assert.match(agentsServiceSource, /assertOwnedModelKey/)
  assert.match(agentsServiceSource, /findFirst\(\{\s*where: \{ id: keyId, userId \}/)
  assert.match(runnerSource, /agent\.modelKey\.userId !== userId/)
})

test('runs use a database lock instead of only an in-memory Set', () => {
  assert.match(schemaSource, /lockKey\s+String\?\s+@unique/)
  assert.match(lockMigrationSource, /CREATE UNIQUE INDEX "AgentRun_lockKey_key"/)
  assert.match(runnerSource, /lockKey: agentId/)
  assert.match(runnerSource, /status: 'failed',[\s\S]{0,80}?lockKey: null/)
  assert.match(runnerSource, /code === 'P2002'/)
})

test('daily quota uses the request timezone and the monthly budget is enforced', () => {
  assert.match(runnerSource, /startOfDayInTimeZone\(timeZone\)/)
  assert.match(runnerSource, /MONTHLY_TOKEN_BUDGET/)
  assert.match(runnerSource, /BUDGET_EXCEEDED/)
  assert.match(agentsControllerSource, /cf\?\.timezone/)
})

test('unread count comes from the server, not the first page', () => {
  assert.match(messagesServiceSource, /db\.agentMessage\.count\(\{ where: \{ userId, read: false \} \}\)/)
  assert.match(messagesServiceSource, /return \{ messages, hasMore: [^,]+, unreadCount \}/)
  assert.match(messagesRepositorySource, /unreadCount: number/)
  assert.match(messagesStoreSource, /unreadCount: result\.unreadCount/)
})
