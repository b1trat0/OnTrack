/**
 * Create the local integration-test database (if missing) and apply migrations.
 * Never points at the development database: the URL must end in _test.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import pg from 'pg'

function fromLocalFile() {
  for (const file of ['apps/backend/.dev.vars', 'apps/backend/.env']) {
    if (!existsSync(file)) continue
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((value) => /^\s*DATABASE_URL\s*=/.test(value))
    if (!line) continue
    const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim().replace(/^["']|["']$/g, '')
    try {
      const url = new URL(raw)
      url.pathname = '/ontrack_test'
      return url.toString()
    } catch {
      return null
    }
  }
  return null
}

const testUrl =
  process.env.TEST_DATABASE_URL ??
  fromLocalFile() ??
  'postgresql://postgres:postgres@localhost:5432/ontrack_test'

const parsed = new URL(testUrl)
if (!parsed.pathname.endsWith('_test')) {
  throw new Error(`Refusing to run integration tests against ${parsed.pathname}`)
}

const admin = new URL(testUrl)
admin.pathname = '/postgres'
admin.search = ''

const client = new pg.Client({ connectionString: admin.toString() })
try {
  await client.connect()
  const database = decodeURIComponent(parsed.pathname.slice(1))
  try {
    await client.query(`CREATE DATABASE "${database}"`)
    console.log(`[test-db] created ${database}`)
  } catch (error) {
    if (error.code !== '42P04') throw error
    console.log(`[test-db] ${database} already exists`)
  }
} finally {
  await client.end()
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
execSync(`${npm} exec --workspace backend -- prisma migrate deploy`, {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testUrl },
  shell: true,
})
