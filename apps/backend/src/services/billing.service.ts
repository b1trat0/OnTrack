import Stripe from 'stripe'
import type { PrismaClient } from '../generated/prisma/client'
import type { Env } from '../types'
import { AppError } from '../lib/http'
import { getEntitlements, PLAN_CATALOG, type PlanId } from './entitlements.service'

export type BillingInterval = 'monthly' | 'yearly'

function stripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('BILLING_NOT_CONFIGURED', 'Stripe is not configured.', 503)
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

export function billingConfigured(env: Env): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
      env.STRIPE_PRICE_PRO_MONTHLY &&
      env.STRIPE_PRICE_PRO_YEARLY &&
      env.STRIPE_WEBHOOK_SECRET
  )
}

function priceId(env: Env, interval: BillingInterval): string {
  const id =
    interval === 'monthly' ? env.STRIPE_PRICE_PRO_MONTHLY : env.STRIPE_PRICE_PRO_YEARLY
  if (!id) {
    throw new AppError('BILLING_NOT_CONFIGURED', `No Stripe price for ${interval}.`, 503)
  }
  return id
}

function planFromSubscription(sub: Stripe.Subscription, env: Env): PlanId {
  const ids = sub.items.data
    .map((item) => item.price?.id)
    .filter((id): id is string => Boolean(id))
  const monthly = env.STRIPE_PRICE_PRO_MONTHLY
  const yearly = env.STRIPE_PRICE_PRO_YEARLY
  if ((monthly && ids.includes(monthly)) || (yearly && ids.includes(yearly))) {
    return 'pro'
  }
  const meta = sub.metadata?.plan
  return meta === 'pro' || meta === 'teams' || meta === 'industry' ? meta : 'free'
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const itemEnd = sub.items.data[0]?.current_period_end
  const value = itemEnd ?? (sub as unknown as { current_period_end?: number }).current_period_end
  return typeof value === 'number' ? new Date(value * 1000) : null
}

export function publicPlans(env: Env) {
  return (Object.keys(PLAN_CATALOG) as PlanId[]).map((id) => {
    const catalog = PLAN_CATALOG[id]
    const isPro = id === 'pro'
    return {
      id,
      name: catalog.name,
      blurb: catalog.blurb,
      features: catalog.features,
      available: catalog.available,
      prices: isPro
        ? {
            monthly: env.PRO_PRICE_MONTHLY ?? null,
            yearly: env.PRO_PRICE_YEARLY ?? null,
            currency: env.BILLING_CURRENCY ?? 'usd',
          }
        : null,
      checkoutAvailable: isPro && billingConfigured(env),
    }
  })
}

export async function getBillingStatus(db: PrismaClient, userId: string, env: Env) {
  const [subscription, entitlements] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    getEntitlements(db, userId),
  ])

  return {
    plan: entitlements.plan,
    status: subscription?.status ?? 'free',
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    configured: billingConfigured(env),
  }
}

async function ensureCustomer(
  db: PrismaClient,
  userId: string,
  env: Env
): Promise<string> {
  const existing = await db.subscription.findUnique({ where: { userId } })
  if (existing?.customerId) return existing.customerId

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('NOT_FOUND', 'User not found.', 404)

  const stripe = stripeClient(env)
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId },
  })

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: 'free',
      status: 'active',
      provider: 'stripe',
      customerId: customer.id,
    },
    update: { provider: 'stripe', customerId: customer.id },
  })

  return customer.id
}

export async function createCheckoutSession(
  db: PrismaClient,
  userId: string,
  interval: BillingInterval,
  env: Env
): Promise<string> {
  const stripe = stripeClient(env)
  const price = priceId(env, interval)
  const customer = await ensureCustomer(db, userId, env)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    allow_promotion_codes: true,
    success_url: `${env.WEB_URL}/#/plans?checkout=success`,
    cancel_url: `${env.WEB_URL}/#/plans?checkout=cancelled`,
    subscription_data: {
      metadata: { userId, plan: 'pro' },
    },
  })

  if (!session.url) {
    throw new AppError('BILLING_ERROR', 'Stripe did not return a checkout URL.', 502)
  }
  return session.url
}

export async function createPortalSession(
  db: PrismaClient,
  userId: string,
  env: Env
): Promise<string> {
  const subscription = await db.subscription.findUnique({ where: { userId } })
  if (!subscription?.customerId) {
    throw new AppError('BILLING_ERROR', 'No billing account exists yet.', 400)
  }
  const stripe = stripeClient(env)
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.customerId,
    return_url: `${env.WEB_URL}/#/plans`,
  })
  return session.url
}

async function syncSubscription(
  db: PrismaClient,
  sub: Stripe.Subscription,
  env: Env,
  userIdHint?: string | null
): Promise<void> {
  let userId: string | null = sub.metadata?.userId ?? userIdHint ?? null
  const customer = sub.customer
  if (!userId && typeof customer === 'string') {
    const row = await db.subscription.findUnique({
      where: { customerId: customer },
      select: { userId: true },
    })
    userId = row?.userId ?? null
  }
  if (!userId) return

  const plan = planFromSubscription(sub, env)
  const data = {
    plan,
    status: sub.status,
    provider: 'stripe',
    customerId: typeof customer === 'string' ? customer : customer?.id ?? null,
    subscriptionId: sub.id,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }

  await db.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}

export async function handleStripeWebhook(
  db: PrismaClient,
  payload: string,
  signature: string,
  env: Env
): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError('BILLING_NOT_CONFIGURED', 'Webhook secret is missing.', 503)
  }
  const stripe = stripeClient(env)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )
  } catch {
    throw new AppError('INVALID_SIGNATURE', 'Invalid Stripe signature.', 400)
  }

  try {
    await db.billingEvent.create({ data: { id: event.id, type: event.type } })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return
    throw error
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (typeof session.subscription === 'string') {
      const sub = await stripe.subscriptions.retrieve(session.subscription)
      await syncSubscription(db, sub, env, session.client_reference_id)
    }
    return
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncSubscription(db, event.data.object as Stripe.Subscription, env)
    return
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (customer) {
      await db.subscription.updateMany({
        where: { customerId: customer },
        data: { status: 'past_due' },
      })
    }
  }
}
