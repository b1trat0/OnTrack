import { hash } from 'bcryptjs'
import app from '../../apps/backend/src/index'
import { prismaClient } from '../../apps/backend/src/db'
import { TEST_ENV } from './env'

export const db = prismaClient(TEST_ENV)

const TABLES = [
  'BillingEvent',
  'Subscription',
  'AgentRun',
  'AgentMessage',
  'AgentTool',
  'Agent',
  'AgentTemplate',
  'ModelKey',
  'IntegrationAccount',
  'Task',
  'Appointment',
  'DiaryEntry',
  'TimerSettings',
  'Reminder',
  'EmailVerificationToken',
  'PasswordResetToken',
  'User',
]

export async function resetDb(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(', ')
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`)
}

export async function closeDb(): Promise<void> {
  await db.$disconnect()
}

export type TestUser = {
  id: string
  email: string
  password: string
  name: string
}

export async function createUser(
  options: { email?: string; password?: string; verified?: boolean; name?: string } = {}
): Promise<TestUser> {
  const email = options.email ?? `user-${crypto.randomUUID()}@ontrack.test`
  const password = options.password ?? 'correct-horse-battery-staple'
  const name = options.name ?? 'Integration User'
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hash(password, 4),
      emailVerified: options.verified ?? true,
    },
  })
  return { id: user.id, email, password, name }
}

type JsonBody = Record<string, unknown> | undefined

export async function request(
  path: string,
  init: { method?: string; body?: JsonBody; token?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `test-${crypto.randomUUID()}`,
    ...(init.headers ?? {}),
  }
  if (init.token) headers.Authorization = `Bearer ${init.token}`
  return app.request(
    path,
    {
      method: init.method ?? 'GET',
      headers,
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    },
    TEST_ENV
  )
}

export type Session = {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const response = await request('/api/auth/signin', {
    method: 'POST',
    body: { email, password },
  })
  if (!response.ok) throw new Error(`Sign-in failed (${response.status}): ${await response.text()}`)
  const body = (await response.json()) as { data: Session }
  return body.data
}

export async function createVerifiedSession(): Promise<{ user: TestUser; session: Session }> {
  const user = await createUser()
  return { user, session: await signIn(user.email, user.password) }
}
