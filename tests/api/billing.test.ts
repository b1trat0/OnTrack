import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { createUser, db, request, signIn } from './db'
import { TEST_ENV } from './env'

const stripe = new Stripe('sk_test_dummy')

function signedEvent(id: string, type: string, object: Record<string, unknown>, userId: string) {
  const event = {
    id,
    object: 'event',
    type,
    data: {
      object: {
        ...object,
        metadata: { userId, plan: 'pro' },
      },
    },
  }
  const payload = JSON.stringify(event)
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: TEST_ENV.STRIPE_WEBHOOK_SECRET,
  })
  return { payload, signature }
}

describe('billing webhook', () => {
  it('rejects a missing or invalid signature', async () => {
    const missing = await request('/api/billing/webhook', {
      method: 'POST',
      body: { id: 'evt_missing' },
      headers: { 'stripe-signature': '' },
    })
    expect(missing.status).toBe(400)

    const invalid = await request('/api/billing/webhook', {
      method: 'POST',
      body: { id: 'evt_invalid' },
      headers: { 'stripe-signature': 't=1,v1=deadbeef' },
    })
    expect(invalid.status).toBe(400)
  })

  it('updates a subscription once per event and grants pro limits', async () => {
    const user = await createUser()
    const { payload, signature } = signedEvent(
      'evt_sub_updated_1',
      'customer.subscription.updated',
      {
        id: 'sub_1',
        object: 'subscription',
        customer: 'cus_1',
        status: 'active',
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: TEST_ENV.STRIPE_PRICE_PRO_MONTHLY },
              current_period_end: Math.floor(Date.now() / 1000) + 86_400,
            },
          ],
        },
      },
      user.id
    )

    const first = await appRequestWebhook(payload, signature)
    expect(first.status).toBe(200)

    const subscription = await db.subscription.findUnique({ where: { userId: user.id } })
    expect(subscription?.plan).toBe('pro')
    expect(subscription?.status).toBe('active')

    const session = await signIn(user.email, user.password)
    const usage = await request('/api/agents/usage', { token: session.accessToken })
    const usageBody = (await usage.json()).data
    expect(usageBody.plan).toBe('pro')
    expect(usageBody.dailyRunLimit).toBe(200)

    const duplicate = await appRequestWebhook(payload, signature)
    expect(duplicate.status).toBe(200)
    expect(await db.billingEvent.count({ where: { id: 'evt_sub_updated_1' } })).toBe(1)
  })

  it('falls back to free when the subscription is canceled', async () => {
    const user = await createUser()
    await db.subscription.create({
      data: { userId: user.id, plan: 'pro', status: 'active', customerId: 'cus_cancel' },
    })

    const { payload, signature } = signedEvent(
      'evt_sub_deleted_1',
      'customer.subscription.deleted',
      {
        id: 'sub_cancel',
        object: 'subscription',
        customer: 'cus_cancel',
        status: 'canceled',
        cancel_at_period_end: false,
        items: { data: [] },
      },
      user.id
    )
    const response = await appRequestWebhook(payload, signature)
    expect(response.status).toBe(200)

    const session = await signIn(user.email, user.password)
    const usage = await request('/api/agents/usage', { token: session.accessToken })
    expect((await usage.json()).data.plan).toBe('free')
  })
})

async function appRequestWebhook(payload: string, signature: string): Promise<Response> {
  const { default: app } = await import('../../apps/backend/src/index')
  return app.request(
    '/api/billing/webhook',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
        'x-forwarded-for': `webhook-${crypto.randomUUID()}`,
      },
      body: payload,
    },
    TEST_ENV
  )
}
