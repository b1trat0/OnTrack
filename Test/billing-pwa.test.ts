import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const schemaSource = await readFile('apps/backend/prisma/schema.prisma', 'utf8')
const migrationSource = await readFile(
  'apps/backend/prisma/migrations/20261105120000_stripe_billing/migration.sql',
  'utf8'
)
const entitlementsSource = await readFile(
  'apps/backend/src/services/entitlements.service.ts',
  'utf8'
)
const billingServiceSource = await readFile(
  'apps/backend/src/services/billing.service.ts',
  'utf8'
)
const billingRouterSource = await readFile('apps/backend/src/routes/billing.router.ts', 'utf8')
const runnerSource = await readFile('apps/backend/src/services/agent.runner.ts', 'utf8')
const plansPageSource = await readFile('apps/web/src/features/plans/PlansPage.tsx', 'utf8')
const billingRepositorySource = await readFile(
  'apps/web/src/global/repositories/billing.repository.ts',
  'utf8'
)
const viteConfigSource = await readFile('apps/web/vite.config.ts', 'utf8')
const indexHtml = await readFile('apps/web/index.html', 'utf8')
const offlineSource = await readFile('apps/web/src/global/ui/OfflineBanner.tsx', 'utf8')
const readme = await readFile('README.md', 'utf8')
const deployment = await readFile('docs/DEPLOYMENT.md', 'utf8')

test('billing schema and migration are additive', () => {
  assert.match(schemaSource, /model Subscription \{/)
  assert.match(schemaSource, /model BillingEvent \{/)
  assert.match(schemaSource, /customerId\s+String\?\s+@unique/)
  assert.match(migrationSource, /CREATE TABLE "Subscription"/)
  assert.match(migrationSource, /CREATE TABLE "BillingEvent"/)
  assert.match(migrationSource, /ON DELETE CASCADE/)
})

test('entitlements define free, pro, teams, and industry limits', () => {
  assert.match(entitlementsSource, /export type PlanId = 'free' \| 'pro' \| 'teams' \| 'industry'/)
  assert.match(entitlementsSource, /monthlyTokens: 500_000/)
  assert.match(entitlementsSource, /monthlyTokens: 2_000_000/)
  assert.match(entitlementsSource, /ACTIVE_STATUSES/)
  assert.match(runnerSource, /getEntitlements\(db, userId\)/)
  assert.match(runnerSource, /entitlements\.dailyRuns/)
  assert.match(runnerSource, /entitlements\.monthlyTokens/)
})

test('Stripe checkout, portal, webhook verification, and idempotency exist', () => {
  assert.match(billingServiceSource, /httpClient: Stripe\.createFetchHttpClient\(\)/)
  assert.match(billingServiceSource, /checkout\.sessions\.create/)
  assert.match(billingServiceSource, /billingPortal\.sessions\.create/)
  assert.match(billingServiceSource, /constructEventAsync/)
  assert.match(billingServiceSource, /billingEvent\.create/)
  assert.match(billingServiceSource, /code === 'P2002'/)
  assert.match(billingServiceSource, /subscription\.upsert/)
})

test('billing routes keep plans/webhook public and the rest authenticated', () => {
  assert.match(billingRouterSource, /get\('\/plans', ctrl\.handlePlans\)/)
  assert.match(billingRouterSource, /post\('\/webhook', ctrl\.handleWebhook\)/)
  assert.match(billingRouterSource, /get\('\/status', authVerify/)
  assert.match(billingRouterSource, /post\('\/checkout', authVerify/)
  assert.match(billingRouterSource, /post\('\/portal', authVerify/)
})

test('plan page uses real checkout and portal, with usage bars', () => {
  assert.match(plansPageSource, /startCheckout/)
  assert.match(plansPageSource, /openBillingPortal/)
  assert.match(plansPageSource, /getPlans/)
  assert.match(plansPageSource, /getBillingStatus/)
  assert.match(plansPageSource, /dailyRuns/)
  assert.match(plansPageSource, /monthlyTokens/)
  assert.match(billingRepositorySource, /\/api\/billing\/checkout/)
  assert.match(billingRepositorySource, /\/api\/billing\/portal/)
})

test('PWA manifest, service worker, and offline shell are configured', () => {
  assert.match(viteConfigSource, /VitePWA\(/)
  assert.match(viteConfigSource, /display: 'standalone'/)
  assert.match(viteConfigSource, /navigateFallback: 'index\.html'/)
  assert.match(viteConfigSource, /icons\/icon-192\.png/)
  assert.match(indexHtml, /apple-touch-icon/)
  assert.match(indexHtml, /theme-color/)
  assert.match(offlineSource, /navigator\.onLine/)
})

test('operator docs include Stripe and PWA deployment steps', () => {
  assert.match(readme, /STRIPE_SECRET_KEY/)
  assert.match(readme, /PWA/)
  assert.match(deployment, /Stripe/)
  assert.match(deployment, /stripe-signature/)
  assert.match(deployment, /service worker|PWA/i)
})
