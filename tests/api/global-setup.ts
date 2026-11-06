import { execFileSync } from 'node:child_process'

export default function setup(): void {
  execFileSync(process.execPath, ['scripts/prepare-test-prisma.mjs'], {
    stdio: 'inherit',
    env: process.env,
  })
  execFileSync(process.execPath, ['scripts/test-db.mjs'], {
    stdio: 'inherit',
    env: process.env,
  })
}
