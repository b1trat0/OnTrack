import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'
import type { Env } from './types'

/**
 * Resolve the database connection.
 *
 * Hyperdrive is optional: when the binding is present (production), its pooled
 * connection string is preferred. Local dev and tests fall back to DATABASE_URL.
 */
export function databaseUrl(env: Env): string {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
}

export function prismaClient(env: Env): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(env),
    max: 1,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 500,
    allowExitOnIdle: true,
  })
  return new PrismaClient({ adapter })
}
