import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const runnerSource = await readFile('apps/backend/src/services/agent.runner.ts', 'utf8')
const actionsSource = await readFile('apps/backend/src/services/agent.actions.ts', 'utf8')
const agentsServiceSource = await readFile('apps/backend/src/services/agents.service.ts', 'utf8')
const agentsControllerSource = await readFile('apps/backend/src/controllers/agents.controller.ts', 'utf8')
const toolsServiceSource = await readFile('apps/backend/src/services/tools.service.ts', 'utf8')
const toolsControllerSource = await readFile('apps/backend/src/controllers/tools.controller.ts', 'utf8')
const authServiceSource = await readFile('apps/backend/src/services/auth.service.ts', 'utf8')
const authRouterSource = await readFile('apps/backend/src/routes/auth.router.ts', 'utf8')
const backendIndexSource = await readFile('apps/backend/src/index.ts', 'utf8')
const apiSource = await readFile('apps/web/src/global/lib/api.ts', 'utf8')
const electronMainSource = await readFile('apps/app/src/main/index.ts', 'utf8')
const calendarStoreSource = await readFile('apps/web/src/global/stores/useCalendarStore.ts', 'utf8')
const diaryStoreSource = await readFile('apps/web/src/global/stores/useDiaryStore.ts', 'utf8')
const userDataSource = await readFile('apps/web/src/global/lib/userData.ts', 'utf8')
const schemaSource = await readFile('apps/backend/prisma/schema.prisma', 'utf8')
const migrationSource = await readFile(
  'apps/backend/prisma/migrations/20261105090000_saas_hardening_p0/migration.sql',
  'utf8'
)

test('draft mode gates every non-inbox write', () => {
  assert.match(runnerSource, /draftOnly: boolean/)
  assert.match(runnerSource, /if \(draftOnly\) \{\s*proposeNote/)
  assert.match(runnerSource, /if \(draftOnly\) \{\s*\/\/ Dated \[EVENT\] lines/)
  assert.match(runnerSource, /proposed: PendingAction\[\]/)
})

test('draft mode still delivers the result to the inbox', () => {
  // The inbox branch runs before the draft check and must never be gated.
  assert.match(
    runnerSource,
    /if \(destination === 'inbox'\) \{[\s\S]{0,240}?createMessage\(/
  )
})

test('approved tasks become Notes cards, not calendar appointments', () => {
  assert.match(actionsSource, /if \(item\.kind === 'task'\) \{[\s\S]{0,400}?createTask\(tx, userId, \{/)
  assert.match(actionsSource, /created\.push\(\{ kind: 'task', id: task\.id \}\)/)
  assert.doesNotMatch(actionsSource, /kind: item\.kind === 'event' \? 'appointment' : 'task'/)
})

test('agent create and update accept a tools list', () => {
  assert.match(agentsControllerSource, /tools: z\.array\(z\.string\(\)\.min\(1\)\.max\(64\)\)/)
  assert.match(agentsServiceSource, /tools\?: string\[\]/)
  assert.match(agentsServiceSource, /assertValidTools\(tools\)/)
  assert.match(agentsServiceSource, /tx\.agentTool\.updateMany/)
})

test('tool routes are scoped to the authenticated owner', () => {
  assert.match(toolsServiceSource, /async function findOwnedAgent\(db: Db, userId: string, agentId: string\)/)
  assert.match(toolsControllerSource, /getAgentTools\(db, c\.get\('userId'\), agentId\)/)
  assert.match(toolsControllerSource, /upsertAgentTool\(db, c\.get\('userId'\), agentId, toolName/)
})

test('signup hands the verification email to executionCtx.waitUntil', () => {
  assert.match(authServiceSource, /waitUntil\?: \(promise: Promise<unknown>\) => void/)
  assert.match(authServiceSource, /if \(input\.waitUntil\) input\.waitUntil\(mailPromise\)/)
  assert.match(authServiceSource, /const mailPromise = sendVerificationMail/)
})

test('credential endpoints are throttled', () => {
  assert.match(authRouterSource, /authRouter\.post\('\/signin', authRateLimit/)
  assert.match(authRouterSource, /authRouter\.post\('\/signup', authRateLimit/)
  assert.match(authRouterSource, /authRouter\.post\('\/forgot-password', authRateLimit/)
})

test('CORS uses an allowlist instead of reflecting any origin', () => {
  assert.match(backendIndexSource, /function allowedOrigins\(env: Env\)/)
  assert.match(backendIndexSource, /originAllowed = Boolean\(origin && allowed\.includes\(origin\)\)/)
  assert.doesNotMatch(backendIndexSource, /origin \?\? '\*'/)
})

test('packaged builds resolve an absolute API origin', () => {
  assert.match(apiSource, /import\.meta\.env\.VITE_API_BASE/)
  assert.match(apiSource, /window\.location\.protocol === 'file:'/)
})

test('Electron renderers have no Node integration', () => {
  assert.match(electronMainSource, /nodeIntegration: false/)
  assert.match(electronMainSource, /contextIsolation: true/)
  assert.match(electronMainSource, /sandbox: true/)
  assert.doesNotMatch(electronMainSource, /nodeIntegration: true/)
})

test('calendar and diary never upload a previous account cache', () => {
  assert.doesNotMatch(calendarStoreSource, /Morning meds|Therapy call|Leg day/)
  assert.doesNotMatch(calendarStoreSource, /const local = get\(\)\.appointments/)
  assert.doesNotMatch(diaryStoreSource, /const legacy = get\(\)\.entries/)
  assert.match(calendarStoreSource, /appointments: \[\]/)
})

test('account switches clear the user-scoped cache', () => {
  assert.match(userDataSource, /export const USER_SCOPED_KEYS/)
  assert.match(userDataSource, /if \(previous !== userId\) \{[\s\S]{0,120}?clearUserStorage/)
  assert.match(userDataSource, /if \(userId === null\) \{[\s\S]{0,80}?clearUserStorage/)
})

test('schema and migration agree on the profile column and indexes', () => {
  assert.match(schemaSource, /avatarUrl\s+String\?/)
  assert.match(schemaSource, /@@index\(\[userId\]\)/)
  assert.match(schemaSource, /model Appointment \{[\s\S]*?createdAt\s+DateTime[\s\S]*?updatedAt\s+DateTime/)
  assert.match(migrationSource, /ADD COLUMN "avatarUrl" TEXT/)
  assert.match(migrationSource, /CREATE INDEX "Agent_userId_idx"/)
  assert.match(migrationSource, /ADD COLUMN "createdAt"/)
})
