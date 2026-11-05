/**
 * Per-account ownership of the client-side cache.
 *
 * Stores persist to localStorage under global keys, so without this guard the
 * next account signed in on the same device would inherit the previous
 * account's notes, calendar, diary, agents, and message inbox. The active user
 * marker plus the clear-on-switch rule is the boundary.
 */

const ACTIVE_USER_KEY = 'ontrack-active-user'

/** Keys that belong to a signed-in user and must never cross accounts. */
export const USER_SCOPED_KEYS = [
  'ontrack-user',
  'ontrack-notes',
  'ontrack-calendar',
  'ontrack-diary',
  'ontrack-agents',
  'ontrack-model-keys',
  'ontrack-agent-messages',
  'ontrack-timer',
] as const

export function getActiveUserId(): string | null {
  return localStorage.getItem(ACTIVE_USER_KEY)
}

export function setActiveUserId(userId: string | null): void {
  if (userId) localStorage.setItem(ACTIVE_USER_KEY, userId)
  else localStorage.removeItem(ACTIVE_USER_KEY)
}

/** Removes every user-scoped cache key. Device preferences are left alone. */
export function clearUserStorage(): void {
  for (const key of USER_SCOPED_KEYS) localStorage.removeItem(key)
}

/**
 * Aligns the persisted cache with the account that is about to use it.
 *
 * - First run after upgrading: adopt the signed-in user without wiping data.
 * - Same user: no-op.
 * - Different user or sign-out: clear the previous account's cache.
 *
 * @returns true when the caller must also reset the in-memory stores
 */
export function syncActiveUser(userId: string | null): boolean {
  const previous = getActiveUserId()

  if (userId === null) {
    clearUserStorage()
    setActiveUserId(null)
    return previous !== null
  }

  if (!previous) {
    setActiveUserId(userId)
    return false
  }

  if (previous !== userId) {
    clearUserStorage()
    setActiveUserId(userId)
    return true
  }

  return false
}
