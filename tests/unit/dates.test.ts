import { afterEach, describe, expect, it, vi } from 'vitest'
import { todayKey } from '../../apps/web/src/global/lib/dates'

describe('date keys', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a stable local YYYY-MM-DD key', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 5, 23, 30))
    expect(todayKey()).toBe('2026-11-05')
  })
})
