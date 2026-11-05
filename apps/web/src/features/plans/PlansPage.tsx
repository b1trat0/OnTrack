import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CreditCard, Gauge, Sparkles } from 'lucide-react'
import {
  getBillingStatus,
  getPlans,
  openBillingPortal,
  startCheckout,
  type BillingStatusDto,
  type PlanDto,
} from '../../global/repositories/billing.repository'
import { getAgentUsage, type AgentUsageDto } from '../../global/repositories/agents.repository'
import { toErrorMessage } from '../../global/lib/api'
import { useToastStore } from '../../global/stores/useToastStore'
import { Card } from '../../global/ui/Card'
import { Button } from '../../global/ui/Button'

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function priceLabel(plan: PlanDto, interval: 'monthly' | 'yearly'): string {
  if (!plan.prices) return ''
  const amount = interval === 'monthly' ? plan.prices.monthly : plan.prices.yearly
  if (!amount) return 'Price not configured'
  return `$${amount} / ${interval === 'monthly' ? 'month' : 'year'}`
}

export function PlansPage() {
  const pushToast = useToastStore((state) => state.push)
  const [plans, setPlans] = useState<PlanDto[]>([])
  const [status, setStatus] = useState<BillingStatusDto | null>(null)
  const [usage, setUsage] = useState<AgentUsageDto | null>(null)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    const [nextPlans, nextStatus, nextUsage] = await Promise.all([
      getPlans(),
      getBillingStatus(),
      getAgentUsage(),
    ])
    setPlans(nextPlans)
    setStatus(nextStatus)
    setUsage(nextUsage)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload()
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // HashRouter keeps the Stripe return query inside the hash.
    const hashQuery = window.location.hash.split('?')[1]
    const outcome = hashQuery ? new URLSearchParams(hashQuery).get('checkout') : null
    if (outcome) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#${window.location.hash.split('?')[0]}`
      )
      pushToast({
        title: outcome === 'success' ? 'Payment received' : 'Checkout cancelled',
        message:
          outcome === 'success'
            ? 'The webhook may take a few seconds to update your plan.'
            : 'You can try again whenever you are ready.',
        level: outcome === 'success' ? 'info' : 'warn',
      })
    }

    return () => {
      cancelled = true
    }
  }, [pushToast])

  const upgrade = async () => {
    setWorking(true)
    try {
      await startCheckout(interval)
    } catch (err) {
      pushToast({ title: 'Could not start checkout', message: toErrorMessage(err), level: 'error' })
    } finally {
      setWorking(false)
    }
  }

  const manage = async () => {
    setWorking(true)
    try {
      await openBillingPortal()
    } catch (err) {
      pushToast({ title: 'Could not open billing', message: toErrorMessage(err), level: 'error' })
    } finally {
      setWorking(false)
    }
  }

  const isPro = status?.plan === 'pro'

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-muted) transition hover:text-(--text)"
        >
          <ArrowLeft size={15} />
          Settings
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Plans</h1>
        <p className="text-sm text-(--text-muted)">
          OnTrack is BYOK: your model provider bills tokens directly. Plans change product limits,
          not token resale.
        </p>
      </header>

      {error ? (
        <Card className="p-5 text-sm text-(--danger)">{error}</Card>
      ) : loading ? (
        <Card className="p-8 text-center text-sm text-(--text-muted)">Loading plans…</Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-(--border) bg-(--surface) p-1">
              {(['monthly', 'yearly'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setInterval(value)}
                  aria-pressed={interval === value}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                    interval === value
                      ? 'bg-(--accent-soft) text-(--accent)'
                      : 'text-(--text-muted) hover:text-(--text)'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            {isPro ? (
              <Button variant="soft" onClick={() => void manage()} disabled={working}>
                <CreditCard size={14} />
                Manage billing
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const current = status?.plan === plan.id
              const isProPlan = plan.id === 'pro'
              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col p-5 ${
                    current ? 'border-(--accent)/50' : plan.available ? '' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    {current ? (
                      <span className="rounded-full bg-(--accent-soft) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--accent)">
                        Current
                      </span>
                    ) : !plan.available ? (
                      <span className="rounded-full bg-(--surface-2) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--text-muted)">
                        Future
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 min-h-10 text-xs text-(--text-muted)">{plan.blurb}</p>

                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {isProPlan ? priceLabel(plan, interval) : plan.id === 'free' ? '$0' : 'Talk to us'}
                  </p>

                  <ul className="mt-4 flex-1 space-y-2 text-[13px] text-(--text-muted)">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check size={14} className="mt-0.5 shrink-0 text-(--success)" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    {current ? (
                      <Button variant="soft" className="w-full" disabled>
                        Your plan
                      </Button>
                    ) : isProPlan ? (
                      <Button
                        className="w-full"
                        onClick={() => void upgrade()}
                        disabled={working || !plan.checkoutAvailable}
                      >
                        {working ? 'Opening…' : plan.checkoutAvailable ? 'Upgrade' : 'Not configured'}
                      </Button>
                    ) : plan.available ? (
                      <Button variant="ghost" className="w-full" disabled>
                        Included
                      </Button>
                    ) : (
                      <a
                        href={`mailto:hello@ontrack.app?subject=OnTrack%20${encodeURIComponent(plan.name)}%20interest`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-(--surface-2) px-4 py-2 text-sm font-medium text-(--text) transition hover:bg-(--border)"
                      >
                        Register interest
                      </a>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Gauge size={16} className="text-(--accent)" />
                This month
              </h2>
              {usage ? (
                <div className="mt-4 flex flex-col gap-5">
                  <div>
                    <div className="flex items-end justify-between text-sm">
                      <span className="font-medium">Daily runs</span>
                      <span className="tabular-nums text-(--text-muted)">
                        {usage.dailyRuns} / {usage.dailyRunLimit}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-(--surface-2)">
                      <div
                        className="h-2 rounded-full bg-(--accent)"
                        style={{ width: `${usagePercent(usage.dailyRuns, usage.dailyRunLimit)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-end justify-between text-sm">
                      <span className="font-medium">Monthly tokens</span>
                      <span className="tabular-nums text-(--text-muted)">
                        {usage.monthlyTokens.toLocaleString()} /{' '}
                        {usage.monthlyTokenLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-(--surface-2)">
                      <div
                        className="h-2 rounded-full bg-(--accent-2)"
                        style={{
                          width: `${usagePercent(usage.monthlyTokens, usage.monthlyTokenLimit)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} className="text-(--accent-2)" />
                Billing
              </h2>
              <p className="mt-2 text-sm text-(--text-muted)">
                {status?.configured
                  ? 'Checkout and the customer portal are handled by Stripe. Card data never touches OnTrack.'
                  : 'Stripe is not configured in this environment. Plans are visible, checkout is disabled.'}
              </p>
              {status?.currentPeriodEnd ? (
                <p className="mt-2 text-xs text-(--text-muted)">
                  Current period ends{' '}
                  {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  {status.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
                </p>
              ) : null}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
