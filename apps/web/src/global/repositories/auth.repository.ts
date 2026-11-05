import { api, ensureFreshSession } from '../lib/api'
import { setAccessToken, setRefreshToken } from '../lib/session'

export type AppUser = {
  id: string
  email: string
  name: string
  emailVerified: boolean
  avatarUrl?: string | null
  createdAt: string
}

export type AuthSession = {
  user: AppUser
  accessToken: string
  /** access token lifetime in seconds */
  expiresIn: number
  refreshToken: string
}

type ServerMessage = { message: string }

export async function signUp(input: {
  email: string
  name: string
  password: string
}): Promise<AppUser> {
  const data = await api<{ user: AppUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.user
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await api<AuthSession>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAccessToken(session.accessToken)
  setRefreshToken(session.refreshToken)
  return session
}

export async function signOut(): Promise<void> {
  await api<void>('/api/auth/signout', { method: 'POST', body: JSON.stringify({}) }).catch(
    () => undefined
  )
}

export async function verifyEmail(token: string): Promise<void> {
  await api<ServerMessage>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export async function resendVerification(email: string): Promise<void> {
  await api<ServerMessage>('/api/auth/verify-email/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function forgotPassword(email: string): Promise<void> {
  await api<ServerMessage>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api<void>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function me(): Promise<AppUser> {
  const data = await api<AppUser>('/api/auth/me')
  return data
}

export async function updateProfile(patch: {
  name?: string
  avatarUrl?: string | null
}): Promise<AppUser> {
  return api<AppUser>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api<void>('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export type AccountExport = Record<string, unknown>

export async function exportAccount(): Promise<AccountExport> {
  return api<AccountExport>('/api/auth/export')
}

export async function deleteAccount(password: string): Promise<void> {
  await api<void>('/api/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}

/** Retries the session using any stored refresh token, then fetches the profile. */
export async function restoreUser(): Promise<AppUser> {
  const ok = await ensureFreshSession()
  if (!ok) throw new Error('No active session.')
  return me()
}