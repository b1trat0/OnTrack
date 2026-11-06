import { describe, expect, it } from 'vitest'
import {
  entitlementsFor,
  isPlanId,
  PLAN_CATALOG,
} from '../../apps/backend/src/services/entitlements.service'

describe('plan entitlements', () => {
  it('recognises only supported plan ids', () => {
    expect(isPlanId('free')).toBe(true)
    expect(isPlanId('pro')).toBe(true)
    expect(isPlanId('teams')).toBe(true)
    expect(isPlanId('industry')).toBe(true)
    expect(isPlanId('enterprise')).toBe(false)
  })

  it('keeps free and pro limits distinct', () => {
    expect(entitlementsFor('free')).toMatchObject({
      plan: 'free',
      dailyRuns: 50,
      monthlyTokens: 500_000,
      scheduledAgents: false,
    })
    expect(entitlementsFor('pro')).toMatchObject({
      plan: 'pro',
      dailyRuns: 200,
      monthlyTokens: 2_000_000,
      scheduledAgents: true,
    })
  })

  it('marks teams and industry as future in the catalogue', () => {
    expect(PLAN_CATALOG.teams.available).toBe(false)
    expect(PLAN_CATALOG.industry.available).toBe(false)
    expect(entitlementsFor('teams').teams).toBe(true)
  })
})
