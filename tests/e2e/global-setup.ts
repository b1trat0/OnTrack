import { execFileSync } from 'node:child_process'
import { hash } from 'bcryptjs'
import pg from 'pg'
import { TEST_DATABASE_URL } from '../api/env'
import { E2E_EMAIL, E2E_PASSWORD } from './auth'

export default async function globalSetup(): Promise<void> {
  execFileSync(process.execPath, ['scripts/test-db.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, TEST_DATABASE_URL },
  })

  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    await client.query('DELETE FROM "User" WHERE email = $1', [E2E_EMAIL])
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [crypto.randomUUID(), E2E_EMAIL, 'E2E User', await hash(E2E_PASSWORD, 4)]
    )
    console.log(`[e2e] seeded ${E2E_EMAIL}`)
  } finally {
    await client.end()
  }
}
