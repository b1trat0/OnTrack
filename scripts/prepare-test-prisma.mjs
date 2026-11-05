/**
 * Generate a Node-runtime Prisma client for API integration tests.
 *
 * The production client is generated with runtime="workerd" and imports a
 * .wasm module that Vite cannot parse. The schema is otherwise identical.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync('apps/backend/prisma/schema.prisma', 'utf8')
const testSchema = source
  .replace(
    'output   = "../src/generated/prisma"',
    'output   = "../src/generated/prisma-test"'
  )
  .replace('runtime  = "workerd"', 'runtime  = "nodejs"')

if (!testSchema.includes('prisma-test') || !testSchema.includes('runtime  = "nodejs"')) {
  throw new Error('Could not rewrite the Prisma schema for the test runtime')
}

writeFileSync('apps/backend/prisma/schema.test.prisma', testSchema)
execSync('npx prisma generate --schema prisma/schema.test.prisma', {
  cwd: 'apps/backend',
  stdio: 'inherit',
  shell: true,
})
