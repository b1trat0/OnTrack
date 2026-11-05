import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Gauge, Sparkles } from 'lucide-react'
import { getAgentUsage, type AgentUsageDto } from '../../global/repositories/agents.repository'
import { toErrorMessage } from '../../global/lib/api'
import { Card } from '../../global/ui/Card'
import { Button } from '../../global/ui/Button'

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function PlansPage() {
  const [usage, setUsage] = useState<AgentUsageDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAgentUsage()
      .then((data) => {
        if (!cancelled) setUsage(data)
      })
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-muted) transition hover:text-(--text)"
        >
          <ArrowLeft size={15} />
          Settings
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Plan &amp; usage</h1>
        <p className="text-sm text-(--text-muted)">
          OnTrack is BYOK during the beta: no card, no subscription, no token resale.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-(--accent)/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-(--accent)">
                Current plan
              </p>
              <h2 className="mt-1 text-xl font-bold">Beta · Bring your own key</h2>
            </div>
            <span className="rounded-full bg-(--accent-soft) px-3 py-1 text-xs font-semibold text-(--accent)">
              Active
            </span>
          </div>
          <p className="mt-2 text-sm text-(--text-muted)">
            You pay your model provider directly. OnTrack stores the key encrypted and never
            returns it from the API.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-(--text-muted)">
            {[
              'Unlimited agents and manual runs',
              '50 runs per local day',
              '500,000 tokens per month across agents',
              'Notes, calendar, diary, timer, and inbox included',
              'Gmail read-only OAuth when configured',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-(--success)" />
                {feature}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Gauge size={16} className="text-(--accent)" />
            This month
          </h2>
          {error ? (
            <p className="mt-3 text-sm text-(--danger)">{error}</p>
          ) : !usage ? (
            <p className="mt-3 text-sm text-(--text-muted)">Loading usage…</p>
          ) : (
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
                <p className="mt-1 text-[11px] text-(--text-muted)">Resets at your local midnight.</p>
              </div>

              <div>
                <div className="flex items-end justify-between text-sm">
                  <span className="font-medium">Monthly tokens</span>
                  <span className="tabular-nums text-(--text-muted)">
                    {usage.monthlyTokens.toLocaleString()} / {usage.monthlyTokenLimit.toLocaleString()}
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
                <p className="mt-1 text-[11px] text-(--text-muted)">
                  Counts tokens reported by your provider; it is a guardrail, not a bill.
                </p>
              </div>

              <p className="rounded-xl bg-(--surface-2) px-3 py-2 text-xs text-(--text-muted)">
                A run is refused at the daily or monthly limit. Nothing is charged by OnTrack.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-(--accent-2)" />
              Pro · not available yet
            </h2>
            <p className="mt-1 max-w-xl text-sm text-(--text-muted)">
              Scheduled agents, email digests, calendar sync, team workspaces, and higher run
              limits are planned. There is no payment flow to sign up for yet — this page will
              not pretend otherwise.
            </p>
          </div>
          <Button
            variant="soft"
            onClick={() => {
              window.location.href =
                'mailto:hello@ontrack.app?subject=OnTrack%20Pro%20interest'
            }}
          >
            Register interest
          </Button>
        </div>
      </Card>
    </div>
  )
}
