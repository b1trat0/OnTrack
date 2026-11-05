import { api } from '../lib/api'

export type PlanId = 'free' | 'pro' | 'teams' | 'industry'

export type PlanDto = {
  id: PlanId
  name: string
  blurb: string
  features: string[]
  available: boolean
  prices: { monthly: string | null; yearly: string | null; currency: string } | null
  checkoutAvailable: boolean
}

export type BillingStatusDto = {
  plan: PlanId
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  configured: boolean
}

export async function getPlans(): Promise<PlanDto[]> {
  return api<PlanDto[]>('/api/billing/plans')
}

export async function getBillingStatus(): Promise<BillingStatusDto> {
  return api<BillingStatusDto>('/api/billing/status')
}

export async function startCheckout(interval: 'monthly' | 'yearly'): Promise<void> {
  const { url } = await api<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ interval }),
  })
  window.location.assign(url)
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await api<{ url: string }>('/api/billing/portal', { method: 'POST' })
  window.location.assign(url)
}
