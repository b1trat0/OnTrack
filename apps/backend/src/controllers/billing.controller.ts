import type { Context } from 'hono'
import { z } from 'zod'
import { prismaClient } from '../db'
import { fail, ok } from '../lib/http'
import { handle, validateBody } from '../lib/validate'
import * as billingService from '../services/billing.service'

const checkoutSchema = z.object({
  interval: z.enum(['monthly', 'yearly']),
})

export const handlePlans = (c: Context) =>
  handle(c, async () => ok(c, billingService.publicPlans(c.env)))

export const handleBillingStatus = (c: Context) =>
  handle(c, async () => {
    const db = prismaClient(c.env)
    return ok(c, await billingService.getBillingStatus(db, c.get('userId'), c.env))
  })

export const handleCheckout = (c: Context) =>
  handle(c, async () => {
    const body = await validateBody(c, checkoutSchema)
    if (!body.ok) return body.response
    const db = prismaClient(c.env)
    const url = await billingService.createCheckoutSession(
      db,
      c.get('userId'),
      body.data.interval,
      c.env
    )
    return ok(c, { url })
  })

export const handlePortal = (c: Context) =>
  handle(c, async () => {
    const db = prismaClient(c.env)
    const url = await billingService.createPortalSession(db, c.get('userId'), c.env)
    return ok(c, { url })
  })

export const handleWebhook = (c: Context) =>
  handle(c, async () => {
    const signature = c.req.header('stripe-signature')
    if (!signature) return fail(c, 'INVALID_SIGNATURE', 'Missing signature.', 400)
    const payload = await c.req.text()
    const db = prismaClient(c.env)
    await billingService.handleStripeWebhook(db, payload, signature, c.env)
    return ok(c, { received: true })
  })
