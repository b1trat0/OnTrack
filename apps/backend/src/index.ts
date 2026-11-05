import { Hono } from 'hono'
import authRouter from './routes/auth.router'
import integrationsRouter from './routes/integrations.router'
import taskRouter from './routes/task.router'
import appointmentRouter from './routes/appointment.router'
import diaryRouter from './routes/diary.router'
import agentsRouter from './routes/agents.router'
import modelKeysRouter from './routes/model-keys.router'
import toolsRouter from './routes/tools.router'
import messagesRouter from './routes/messages.router'
import templatesRouter from './routes/templates.router'
import runsRouter from './routes/runs.router'
import billingRouter from './routes/billing.router'
import type { AppVariables, Env } from './types'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('/api/*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

function allowedOrigins(env: Env): string[] {
  const configured = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return [
    ...new Set([
      env.WEB_URL,
      'http://localhost:3456',
      'http://127.0.0.1:3456',
      // Packaged Electron loads from file://, where the browser reports a null
      // origin. Requests are Bearer-only, so this does not grant cookie access.
      'null',
      ...configured,
    ]),
  ].filter(Boolean)
}

app.use('/api/*', async (c, next) => {
  const origin = c.req.header('Origin')
  const allowed = allowedOrigins(c.env)
  const originAllowed = Boolean(origin && allowed.includes(origin))

  if (originAllowed) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Vary', 'Origin')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    c.header('Access-Control-Expose-Headers', 'X-Request-Id')
    c.header('Access-Control-Max-Age', '600')
  }

  if (c.req.method === 'OPTIONS') {
    if (origin && !originAllowed) return c.body(null, 403)
    return c.body(null, 204)
  }

  await next()
})

app.get('/', (c) => c.text('Hello Hono!'))

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'ontrack-api', time: new Date().toISOString() })
)

app.route('/api/auth', authRouter)
app.route('/api/auth/gmail', integrationsRouter)
app.route('/api/tasks', taskRouter)
app.route('/api/appointments', appointmentRouter)
app.route('/api/diary', diaryRouter)
app.route('/api/agents/messages', messagesRouter)
app.route('/api/agents', agentsRouter)
app.route('/api/model-keys', modelKeysRouter)
app.route('/api/tools', toolsRouter)
app.route('/api/templates', templatesRouter)
app.route('/api/billing', billingRouter)
app.route('/api', runsRouter)

export default app