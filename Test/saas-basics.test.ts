import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readme = await readFile('README.md', 'utf8')
const deployment = await readFile('docs/DEPLOYMENT.md', 'utf8')
const plansSource = await readFile('apps/web/src/features/plans/PlansPage.tsx', 'utf8')
const agentsRepositorySource = await readFile(
  'apps/web/src/global/repositories/agents.repository.ts',
  'utf8'
)
const runnerSource = await readFile('apps/backend/src/services/agent.runner.ts', 'utf8')
const agentsControllerSource = await readFile(
  'apps/backend/src/controllers/agents.controller.ts',
  'utf8'
)
const agentsRouterSource = await readFile('apps/backend/src/routes/agents.router.ts', 'utf8')
const notificationsSource = await readFile(
  'apps/web/src/features/notifications/useNotifications.ts',
  'utf8'
)
const notificationCentreSource = await readFile(
  'apps/web/src/features/notifications/NotificationCentre.tsx',
  'utf8'
)
const navbarSource = await readFile('apps/web/src/global/layout/Navbar.tsx', 'utf8')
const userDataSource = await readFile('apps/web/src/global/lib/userData.ts', 'utf8')

test('README is a real OnTrack guide, not the starter template', () => {
  assert.match(readme, /OnTrack/)
  assert.match(readme, /DATABASE_URL/)
  assert.match(readme, /npm run dev/)
  assert.match(readme, /VITE_API_BASE/)
  assert.doesNotMatch(readme, /BARE MINIMUM/)
})

test('deployment runbook covers migrations, secrets, deploy, and rollback', () => {
  assert.match(deployment, /prisma migrate deploy/)
  assert.match(deployment, /wrangler secret put/)
  assert.match(deployment, /wrangler rollback/)
  assert.match(deployment, /hyperdrive/i)
})

test('plan page shows usage and is honest about BYOK', () => {
  assert.match(plansSource, /getAgentUsage/)
  assert.match(plansSource, /BYOK/)
  assert.match(plansSource, /Register interest/)
  assert.match(plansSource, /dailyRuns/)
  assert.match(plansSource, /monthlyTokens/)
})

test('usage endpoint exists before the generic agent id route', () => {
  assert.match(runnerSource, /export const DAILY_RUN_LIMIT/)
  assert.match(runnerSource, /export const MONTHLY_TOKEN_BUDGET/)
  assert.match(runnerSource, /export async function getRunUsage/)
  assert.match(agentsControllerSource, /handleGetUsage/)
  assert.match(agentsRouterSource, /get\('\/usage'/)
  assert.match(agentsRepositorySource, /AgentUsageDto/)
})

test('notification centre covers tasks, calendar, agents, and timer', () => {
  assert.match(notificationsSource, /Due today/)
  assert.match(notificationsSource, /Overdue/)
  assert.match(notificationsSource, /appointment/)
  assert.match(notificationsSource, /Agent update/)
  assert.match(notificationsSource, /reminder:/)
  assert.match(notificationCentreSource, /NotificationCentre/)
  assert.match(navbarSource, /<NotificationCentre \/>/)
})

test('notification read state is user-scoped and reset on account switch', () => {
  assert.match(userDataSource, /'ontrack-notifications'/)
  assert.match(notificationCentreSource, /markAllSeen/)
})
