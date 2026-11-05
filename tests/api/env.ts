import { existsSync, readFileSync } from 'node:fs'

function testUrlFromLocalFile(): string | null {
  for (const file of ['apps/backend/.dev.vars', 'apps/backend/.env']) {
    if (!existsSync(file)) continue
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((value) => /^\s*DATABASE_URL\s*=/.test(value))
    if (!line) continue
    const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim().replace(/^["']|["']$/g, '')
    try {
      const url = new URL(raw)
      url.pathname = '/ontrack_test'
      return url.toString()
    } catch {
      return null
    }
  }
  return null
}

/**
 * Integration tests must never touch the development database. The URL is
 * forced to a `_test` database even when derived from local env.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  testUrlFromLocalFile() ??
  'postgresql://postgres:postgres@localhost:5432/ontrack_test'

if (!new URL(TEST_DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point at a database ending in _test')
}

export const TEST_USER_PASSWORD = 'correct-horse-battery-staple'

export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'integration-test-jwt-secret-at-least-32-characters',
  RESEND_API_KEY: '',
  WEB_URL: 'http://localhost:3456',
  OPENROUTER_API_KEY: '',
  MODEL_KEY_ENCRYPTION_KEY: '00'.repeat(32),
  INTEGRATION_ENCRYPTION_KEY: '11'.repeat(32),
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_REDIRECT_URI: '',
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  STRIPE_PRICE_PRO_MONTHLY: 'price_monthly_test',
  STRIPE_PRICE_PRO_YEARLY: 'price_yearly_test',
  PRO_PRICE_MONTHLY: '8',
  PRO_PRICE_YEARLY: '80',
  BILLING_CURRENCY: 'usd',
} as const
