import pg from 'pg'
import { TEST_DATABASE_URL } from '../api/env'
import { E2E_EMAIL } from './auth'

export default async function globalTeardown(): Promise<void> {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    await client.query('DELETE FROM "User" WHERE email = $1', [E2E_EMAIL])
    console.log(`[e2e] removed ${E2E_EMAIL}`)
  } finally {
    await client.end()
  }
}
