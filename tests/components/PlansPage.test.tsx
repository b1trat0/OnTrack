// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const billing = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getBillingStatus: vi.fn(),
  startCheckout: vi.fn(),
  openBillingPortal: vi.fn(),
}))

const agents = vi.hoisted(() => ({ getAgentUsage: vi.fn() }))

vi.mock('../../apps/web/src/global/repositories/billing.repository', () => billing)
vi.mock('../../apps/web/src/global/repositories/agents.repository', () => agents)

import { PlansPage } from '../../apps/web/src/features/plans/PlansPage'

const plans = [
  {
    id: 'free',
    name: 'Free',
    blurb: 'Free plan',
    features: ['Notes'],
    available: true,
    prices: null,
    checkoutAvailable: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    blurb: 'Pro plan',
    features: ['Higher limits'],
    available: true,
    prices: { monthly: '8', yearly: '80', currency: 'usd' },
    checkoutAvailable: true,
  },
  {
    id: 'teams',
    name: 'Teams',
    blurb: 'Future',
    features: ['Shared'],
    available: false,
    prices: null,
    checkoutAvailable: false,
  },
  {
    id: 'industry',
    name: 'Industry',
    blurb: 'Future',
    features: ['Custom'],
    available: false,
    prices: null,
    checkoutAvailable: false,
  },
]

beforeEach(() => {
  billing.getPlans.mockResolvedValue(plans)
  billing.getBillingStatus.mockResolvedValue({
    plan: 'free',
    status: 'free',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    configured: true,
  })
  billing.startCheckout.mockResolvedValue(undefined)
  billing.openBillingPortal.mockResolvedValue(undefined)
  agents.getAgentUsage.mockResolvedValue({
    plan: 'free',
    dailyRuns: 3,
    dailyRunLimit: 50,
    monthlyTokens: 1200,
    monthlyTokenLimit: 500000,
    monthStart: '2026-11-01T00:00:00.000Z',
  })
})

describe('PlansPage', () => {
  it('renders free, pro, and future tiers with usage', async () => {
    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Teams')).toBeInTheDocument()
    expect(screen.getByText('Industry')).toBeInTheDocument()
    expect(screen.getByText('$8 / month')).toBeInTheDocument()
    expect(screen.getByText('3 / 50')).toBeInTheDocument()
  })

  it('starts monthly and yearly checkout', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>
    )

    const upgrade = await screen.findByRole('button', { name: 'Upgrade' })
    await user.click(upgrade)
    expect(billing.startCheckout).toHaveBeenCalledWith('monthly')

    await user.click(screen.getByRole('button', { name: /yearly/i }))
    await user.click(screen.getByRole('button', { name: 'Upgrade' }))
    expect(billing.startCheckout).toHaveBeenLastCalledWith('yearly')
  })
})
