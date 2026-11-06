import { describe, expect, it } from 'vitest'
import {
  billingConfigured,
  publicPlans,
} from '../../apps/backend/src/services/billing.service'
import type { Env } from '../../apps/backend/src/types'

const env = {
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_SECRET: 'test',
  RESEND_API_KEY: '',
  WEB_URL: 'http://localhost:3456',
  OPENROUTER_API_KEY: '',
  MODEL_KEY_ENCRYPTION_KEY: '00'.repeat(32),
  INTEGRATION_ENCRYPTION_KEY: '11'.repeat(32),
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_REDIRECT_URI: '',
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_PRO_MONTHLY: 'price_monthly',
  STRIPE_PRICE_PRO_YEARLY: 'price_yearly',
  PRO_PRICE_MONTHLY: '8',
  PRO_PRICE_YEARLY: '80',
  BILLING_CURRENCY: 'usd',
} satisfies Env

describe('billing plan catalogue', () => {
  it('exposes free, pro, teams, and industry', () => {
    const plans = publicPlans(env)
    expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro', 'teams', 'industry'])
    expect(plans.find((plan) => plan.id === 'pro')?.prices).toEqual({
      monthly: '8',
      yearly: '80',
      currency: 'usd',
    })
    expect(plans.find((plan) => plan.id === 'teams')?.available).toBe(false)
  })

  it('requires all Stripe values before enabling checkout', () => {
    expect(billingConfigured(env)).toBe(true)
    expect(billingConfigured({ ...env, STRIPE_WEBHOOK_SECRET: undefined })).toBe(false)
    expect(billingConfigured({ ...env, STRIPE_PRICE_PRO_YEARLY: undefined })).toBe(false)
  })

  it('reports checkout as unavailable without Stripe', () => {
    const plans = publicPlans({ ...env, STRIPE_SECRET_KEY: undefined })
    expect(plans.find((plan) => plan.id === 'pro')?.checkoutAvailable).toBe(false)
  })
})
