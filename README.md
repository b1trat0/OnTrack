# OnTrack

OnTrack is an ADHD-friendly personal workspace: notes, calendar, diary, a focus timer,
an always-on-top desktop dashboard, and a BYOK agent platform that can read email/news,
summarize it, and deliver the result to your inbox, notes, or calendar.

> **Status: private beta.** The engineering hardening pass (P0–P2) is complete; the
> remaining product work is billing, CI/E2E, mobile/PWA, and deeper integrations.
> See `report.html` for the audit and the current score.

## What is in it

- **Notes** — three-column kanban with drag & drop, priorities, due dates, daily reset,
  and optimistic sync.
- **Calendar** — month grid, appointments, birthdays, calendar-only tasks, colours, notes.
- **Diary** — moods, tags, month pagination, and password-gated hidden entries.
- **Timer** — presets, pause/resume, chimes, escalating reminders, browser notifications.
- **Agents** — three seeded agents, BYOK model keys for OpenRouter/DeepSeek/Groq/OpenAI/
  Anthropic, 14-tool registry, output destinations, inbox, run history, and approval of
  proposed tasks/events/notes.
- **Desktop** — Electron tray, main window, always-on-top dashboard wedge window.
- **Accounts** — email verification, refresh sessions, password reset/change, profile,
  JSON export, account deletion, Stripe checkout/portal, and plan-aware quotas.
- **UX** — four themes, command palette (`Ctrl/Cmd+K`), onboarding, notification centre,
  keyboard-accessible dialogs/menus, reduced-motion support.
- **PWA** — installable manifest, service worker/offline shell, safe-area layout, and
  an honest offline banner. Web push is the next mobile step.

## Stack

| Layer | Choice |
|---|---|
| Web | React 19, Vite 5, TypeScript, Tailwind v4, Zustand, dnd-kit, Motion |
| API | Hono on Cloudflare Workers, Zod validation, JWT auth |
| Data | Postgres + Prisma 7 (`@prisma/adapter-pg`, optional Hyperdrive) |
| Desktop | Electron 34, Vite plugin, sandboxed preload |
| Email | Resend |
| LLMs | BYOK (OpenRouter by default), `ai` + `@ai-sdk/openai-compatible` |
| Tooling | Turborepo + npm workspaces, ESLint, Prettier, Node test runner |

## Repository layout

```
apps/
  web/       React app (port 3456)
  backend/   Hono Worker (port 7891) + Prisma schema/migrations
  app/       Electron main + preload + builder
  builder/   Packages the web + desktop dists
packages/
  eslint-config-turbotron/
Test/        Node static/regression tests
DATAMODEL.md Data contract, API surface, deployment notes
docs/        Deployment runbook
report.html  Human-facing audit (not application source)
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local Postgres) or a Postgres 16 instance
- A Cloudflare account for deploying the Worker (optional for local dev)
- A Resend API key for verification/reset email (optional if you do not sign up locally)
- A Google OAuth client for Gmail tools (optional)

## Setup

```bash
npm install
```

### 1. Database

```bash
docker run --name ontrack-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ontrack -p 5432:5432 -d postgres:16
```

Create `apps/backend/.env` (or `.dev.vars`) with at least:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ontrack"
JWT_SECRET="replace-with-a-long-random-string"
RESEND_API_KEY=""
WEB_URL="http://localhost:3456"
OPENROUTER_API_KEY=""
MODEL_KEY_ENCRYPTION_KEY="64-hex-characters"
INTEGRATION_ENCRYPTION_KEY="64-hex-characters"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:7891/api/auth/gmail/callback"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_PRO_MONTHLY=""
STRIPE_PRICE_PRO_YEARLY=""
PRO_PRICE_MONTHLY="8"
PRO_PRICE_YEARLY="80"
BILLING_CURRENCY="usd"
```

Generate the two encryption keys with a CSPRNG, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Apply migrations and generate the in-repo Prisma client:

```bash
npm exec --workspace backend -- prisma migrate deploy
npm exec --workspace backend -- prisma generate
```

### 2. Run

```bash
npm run dev
```

- Web: <http://localhost:3456>
- API: <http://127.0.0.1:7891>
- Vite proxies `/api` to the Worker.

Per workspace: `npm run dev -w web`, `npm run dev -w app`, `npm run dev -w backend`.

### 3. Desktop

```bash
npm run dev -w app
```

For a packaged build, the web app must be built first, then the desktop app:

```bash
npm run build
```

Packaged builds load from `file://`; set `VITE_API_BASE` to the deployed API origin
(see `apps/web/.env.example`) or the app will refuse to make API calls. Gmail OAuth
for packaged builds still needs a deployed `WEB_URL` and a callback strategy.

### 4. Billing (optional)

Billing is disabled until Stripe is configured. Create two recurring prices (Pro monthly
and yearly), then set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_PRO_YEARLY`. The display amounts come from
`PRO_PRICE_MONTHLY` / `PRO_PRICE_YEARLY`. Webhook endpoint:
`POST /api/billing/webhook`. See `docs/DEPLOYMENT.md` for the Stripe CLI loop.

### 5. PWA

`npm run build -w web` emits `manifest.webmanifest`, `sw.js`, and an offline shell.
The app is installable from the browser; API writes still need connectivity. Web push
(VAPID + subscription table) is the next step.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | web + desktop + backend |
| `npm run build` | web → desktop → builder |
| `npm run lint` | web + desktop ESLint |
| `npm test` | Node regression suite |
| `npm run format` | Prettier |

There is no standalone typecheck script; `npm run build -w web` / `-w app` run `tsc`.
Backend typecheck:

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json
```

## Security model (short)

- Access tokens are 15-minute JWTs kept in memory; refresh tokens are 30-day opaque
  values stored as SHA-256 digests. Verification/reset tokens are also digested.
- Passwords use bcrypt (12 rounds).
- BYOK keys and Gmail refresh tokens are encrypted with AES-256-GCM; API keys are never
  returned by GET.
- Every data route scopes by the authenticated `userId`; agent tool routes verify agent
  ownership. Agents may only reference their owner's model key.
- Agent runs hold a database lock (`AgentRun.lockKey`) so two Workers cannot run the
  same agent. Quotas: 50 runs/local day, 500k tokens/month.
- External agent content is wrapped in `<untrusted_data>` and truncated before the LLM.
- CORS is an allowlist; credential endpoints are rate-limited (best-effort per isolate
  until a distributed limiter lands).
- Stripe webhooks verify the signature and dedupe by event id; card data never touches
  OnTrack.
- Electron runs with `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`,
  and a CSP. Prefer moving the web refresh token to an httpOnly cookie as the next step.

## Docs

- `DATAMODEL.md` — entities, Prisma schema, REST contract, sync/deployment notes.
- `SUGGESTION.md` — agent-platform design and roadmap.
- `docs/DEPLOYMENT.md` — production runbook.
- `report.html` — human-facing audit, findings, and post-hardening score.

## License

MIT. See `LICENSE`.
