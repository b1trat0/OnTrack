# Deployment runbook

Production checklist for the OnTrack API, web app, and desktop build. Read
`DATAMODEL.md` first; it is the data/API contract.

## 0. Prerequisites

- Cloudflare account with Workers enabled
- Postgres 16 (Neon, Supabase, RDS, or Cloudflare Hyperdrive in front of one)
- Resend account and a verified sending domain
- Google OAuth client for Gmail (optional)
- A deployed web origin, e.g. `https://app.ontrack.example`
- A deployed API origin, e.g. `https://api.ontrack.example`

## 1. Database

1. Create the database and copy its connection string. Keep SSL on in production.
2. From the repository root, apply migrations against the production URL:

   ```bash
   DATABASE_URL="postgresql://…" \
     npm exec --workspace backend -- prisma migrate deploy
   ```

3. Do **not** run `prisma migrate dev` or `migrate reset` against production.
4. Verify the tables and the two hardening migrations exist:

   ```sql
   SELECT migration_name, finished_at
   FROM "_prisma_migrations"
   ORDER BY finished_at DESC;
   ```

## 2. Secrets

Set each as a Worker secret (never commit them):

```bash
cd apps/backend
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put OPENROUTER_API_KEY
wrangler secret put MODEL_KEY_ENCRYPTION_KEY
wrangler secret put INTEGRATION_ENCRYPTION_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI
```

- `JWT_SECRET`: long random string.
- `MODEL_KEY_ENCRYPTION_KEY` / `INTEGRATION_ENCRYPTION_KEY`: 32 random bytes as 64 hex
  characters. Losing either makes existing stored keys/tokens undecryptable.
- `OPENROUTER_API_KEY` is only the fallback for agents with no BYOK key.

## 3. Worker variables

In `apps/backend/wrangler.jsonc` set:

```jsonc
"vars": {
  "WEB_URL": "https://app.ontrack.example",
  "CORS_ORIGINS": "https://app.ontrack.example"
}
```

`CORS_ORIGINS` is a comma-separated allowlist in addition to `WEB_URL`, localhost, and
the desktop `null` origin.

Optional Hyperdrive (recommended for production):

```jsonc
"hyperdrive": [
  { "binding": "HYPERDRIVE", "id": "<hyperdrive-config-id>" }
]
```

The API prefers `HYPERDRIVE.connectionString` when the binding exists.

## 4. Deploy the API

```bash
npm run deploy -w backend
```

Smoke checks:

```bash
curl https://api.ontrack.example/health
# {"status":"ok","service":"ontrack-api","time":"…"}

curl -i https://api.ontrack.example/api/auth/me
# 401 with a JSON error envelope and an X-Request-Id header
```

Create an account through the web app, verify the email, and confirm you can add a
task. Then connect a model key and run one agent.

## 5. Deploy the web app

```bash
VITE_API_BASE="https://api.ontrack.example" npm run build -w web
```

Deploy `apps/web/dist` to Cloudflare Pages, Netlify, or any static host. The app uses a
hash router, so no rewrite rules are required. Set the same `VITE_API_BASE` in the
hosting environment before building.

## 6. Gmail OAuth

1. In Google Cloud Console add the callback:
   `https://api.ontrack.example/api/auth/gmail/callback`.
2. Set `GOOGLE_REDIRECT_URI` to that exact URL.
3. Add the deployed web origin as an authorized JavaScript origin if Google asks.
4. Request only `gmail.readonly`.
5. After deploy, connect Gmail from the agent editor and confirm `/api/auth/gmail/status`
   returns the account email.

Packaged Electron builds load from `file://`; their localStorage is not the web origin's
localStorage. Treat Gmail OAuth in the desktop build as unsupported until a
deep-link/code-exchange flow exists.

## 7. Desktop packaging

```bash
npm run build
```

- `apps/builder` uses the web and desktop `dist` outputs.
- Set `VITE_API_BASE` before building the web app. Packaged builds refuse API calls
  without it.
- Sign the installer before distributing it. The current build is unsigned.
- The desktop app requires a reachable HTTPS API origin; `http://127.0.0.1:7891` is for
  local development only.

## 8. Post-deploy verification

- [ ] `/health` returns 200.
- [ ] Signup → verification email → sign-in works.
- [ ] Wrong password returns 401; repeated attempts return 429.
- [ ] Task create → drag → reload persists.
- [ ] Diary hidden entry strips content; unlock with password works.
- [ ] Agent run writes only to the Inbox in draft mode.
- [ ] Approving a TASK creates a Notes card; EVENT creates a calendar row.
- [ ] Second account on the same device sees no first-account data.
- [ ] `GET /api/auth/export` downloads JSON; delete account requires password + DELETE.
- [ ] `X-Request-Id` is present on API responses.
- [ ] Logs show JSON events, not raw console lines.

## 9. Rollback

The API is a Worker; use a versioned rollback:

```bash
cd apps/backend
wrangler deployments list
wrangler rollback <deployment-id>
```

For code, revert the relevant commit on a branch and redeploy — never force-push or
rewrite `main`. Migrations in this repo are additive; there is no down migration. If a
migration must be undone, take a backup first and write a new compensating migration.

## 10. Backups and retention

- Enable automated daily backups on the Postgres provider.
- Test a restore into a staging database before relying on it.
- `AgentRun` rows are the audit log for token spend; define a retention window
  (e.g. 90 days) before pruning.
- Export is user-triggered JSON; it includes hidden diary content, so treat the file as
  sensitive.

## 11. Key rotation

- **JWT_SECRET**: rotating signs everyone out. Do it during a maintenance window.
- **MODEL_KEY_ENCRYPTION_KEY / INTEGRATION_ENCRYPTION_KEY**: cannot be rotated in place
  yet. Re-encrypt rows with a migration script before swapping the secret.
- **RESEND_API_KEY / OPENROUTER_API_KEY**: rotate immediately if exposed; update the
  Worker secret and redeploy.

## 12. Known production gaps

- Rate limiting is per-isolate until a KV/DO-backed limiter is added.
- No CI workflow; checks are run manually.
- No E2E suite; the Node tests are mostly static source assertions.
- No billing/payment provider; the plan page is honest about BYOK beta limits.
- Task board has no archive/pagination; very old done tasks stay in the load.
