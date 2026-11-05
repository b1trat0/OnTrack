import type { PrismaClient } from '../generated/prisma/client'

export type PlanId = 'free' | 'pro' | 'teams' | 'industry'

export type Entitlements = {
  plan: PlanId
  dailyRuns: number
  monthlyTokens: number
  scheduledAgents: boolean
  calendarSync: boolean
  teams: boolean
}

export const PLAN_CATALOG: Record<
  PlanId,
  { name: string; available: boolean; blurb: string; features: string[] }
> = {
  free: {
    name: 'Free',
    available: true,
    blurb: 'BYOK beta. The whole personal workspace, no card.',
    features: [
      'Notes, calendar, diary, timer, and dashboard',
      'Unlimited agents and manual runs',
      '50 runs per local day',
      '500,000 agent tokens per month',
      'Gmail read-only OAuth when configured',
    ],
  },
  pro: {
    name: 'Pro',
    available: true,
    blurb: 'Higher limits and automation for people who live in OnTrack.',
    features: [
      'Everything in Free',
      '200 runs per local day',
      '2,000,000 agent tokens per month',
      'Scheduled agents (when the scheduler ships)',
      'Calendar sync (when the integration ships)',
    ],
  },
  teams: {
    name: 'Teams',
    available: false,
    blurb: 'Shared workspaces and roles. Planned, not purchasable.',
    features: ['Everything in Pro', 'Shared workspaces', 'Roles and audit trail', 'Team agent library'],
  },
  industry: {
    name: 'Industry',
    available: false,
    blurb: 'Custom deployment for clinics, studios, and small teams.',
    features: ['Everything in Teams', 'Custom retention', 'Onboarding support', 'Private deployment'],
  },
}

const LIMITS: Record<PlanId, Omit<Entitlements, 'plan'>> = {
  free: {
    dailyRuns: 50,
    monthlyTokens: 500_000,
    scheduledAgents: false,
    calendarSync: false,
    teams: false,
  },
  pro: {
    dailyRuns: 200,
    monthlyTokens: 2_000_000,
    scheduledAgents: true,
    calendarSync: true,
    teams: false,
  },
  teams: {
    dailyRuns: 500,
    monthlyTokens: 5_000_000,
    scheduledAgents: true,
    calendarSync: true,
    teams: true,
  },
  industry: {
    dailyRuns: 1_000,
    monthlyTokens: 20_000_000,
    scheduledAgents: true,
    calendarSync: true,
    teams: true,
  },
}

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export function isPlanId(value: string): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'teams' || value === 'industry'
}

export function entitlementsFor(plan: PlanId): Entitlements {
  return { plan, ...LIMITS[plan] }
}

/**
 * Resolve the effective plan. A canceled/incomplete subscription falls back to
 * free immediately, without deleting the row (so the portal still works).
 */
export async function getEntitlements(
  db: PrismaClient,
  userId: string
): Promise<Entitlements> {
  const subscription = await db.subscription.findUnique({ where: { userId } })
  if (!subscription) return entitlementsFor('free')
  if (!ACTIVE_STATUSES.has(subscription.status)) return entitlementsFor('free')
  const plan = isPlanId(subscription.plan) ? subscription.plan : 'free'
  return entitlementsFor(plan)
}
