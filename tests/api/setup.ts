import { afterAll, beforeEach } from 'vitest'
import { closeDb, resetDb } from './db'

beforeEach(async () => {
  await resetDb()
})

afterAll(async () => {
  await closeDb()
})
