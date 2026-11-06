/**
 * Write the E2E Worker secrets file. The Worker is started with
 * `wrangler dev --env e2e`, which reads `.dev.vars.e2e`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

function fromLocalFile() {
  for (const file of ['apps/backend/.dev.vars', 'apps/backend/.env']) {
    if (!existsSync(file)) continue
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((value) => /^\s*DATABASE_URL\s*=/.test(value))
    if (!line) continue
    try {
      const url = new URL(line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim().replace(/^["']|["']$/g, ''))
      url.pathname = '/ontrack_test'
      return url.toString()
    } catch {
      return null
    }
  }
  return null
}

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  fromLocalFile() ??
  'postgresql://postgres:postgres@localhost:5432/ontrack_test'

const vars = {
  DATABASE_URL: databaseUrl,
  JWT_SECRET: 'e2e-jwt-secret-at-least-32-characters-long',
  RESEND_API_KEY: '',
  WEB_URL: 'http://localhost:3456',
  OPENROUTER_API_KEY: '',
  MODEL_KEY_ENCRYPTION_KEY: '00'.repeat(32),
  INTEGRATION_ENCRYPTION_KEY: '11'.repeat(32),
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_REDIRECT_URI: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  STRIPE_PRICE_PRO_MONTHLY: '',
  STRIPE_PRICE_PRO_YEARLY: '',
  PRO_PRICE_MONTHLY: '8',
  PRO_PRICE_YEARLY: '80',
  BILLING_CURRENCY: 'usd',
}

const body = Object.entries(vars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')

writeFileSync('apps/backend/.dev.vars.e2e', `${body}\n`)
console.log('[e2e] wrote apps/backend/.dev.vars.e2e')
