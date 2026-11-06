import { describe, expect, it } from 'vitest'
import { createUser, db, request, signIn } from './db'

describe('auth API', () => {
  it('signs in a verified user and returns an access/refresh pair', async () => {
    const user = await createUser()
    const session = await signIn(user.email, user.password)
    expect(session.accessToken).toBeTypeOf('string')
    expect(session.refreshToken).toBeTypeOf('string')
    expect(session.user.email).toBe(user.email)
  })

  it('rejects a wrong password and an unverified account', async () => {
    const user = await createUser()
    const wrong = await request('/api/auth/signin', {
      method: 'POST',
      body: { email: user.email, password: 'nope' },
    })
    expect(wrong.status).toBe(401)

    const unverified = await createUser({ verified: false })
    const blocked = await request('/api/auth/signin', {
      method: 'POST',
      body: { email: unverified.email, password: unverified.password },
    })
    expect(blocked.status).toBe(403)
    expect((await blocked.json()).error.code).toBe('EMAIL_UNVERIFIED')
  })

  it('refreshes a session and revokes it on sign-out', async () => {
    const user = await createUser()
    const session = await signIn(user.email, user.password)

    const refreshed = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    })
    expect(refreshed.status).toBe(200)
    const refreshedBody = await refreshed.json()
    expect(refreshedBody.data.accessToken).toBeTypeOf('string')

    const signout = await request('/api/auth/signout', {
      method: 'POST',
      token: session.accessToken,
      body: {},
    })
    expect(signout.status).toBe(204)

    const after = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    })
    expect(after.status).toBe(401)
  })

  it('exports the account as JSON without password material', async () => {
    const user = await createUser()
    const session = await signIn(user.email, user.password)
    const response = await request('/api/auth/export', { token: session.accessToken })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.user.email).toBe(user.email)
    expect(JSON.stringify(body.data)).not.toContain('passwordHash')
  })

  it('deletes the account only with the current password', async () => {
    const user = await createUser()
    const session = await signIn(user.email, user.password)

    const wrong = await request('/api/auth/me', {
      method: 'DELETE',
      token: session.accessToken,
      body: { password: 'wrong' },
    })
    expect(wrong.status).toBe(403)

    const deleted = await request('/api/auth/me', {
      method: 'DELETE',
      token: session.accessToken,
      body: { password: user.password },
    })
    expect(deleted.status).toBe(204)
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull()
  })

  it('rate-limits repeated credential attempts', async () => {
    const attempts = []
    for (let index = 0; index < 18; index += 1) {
      attempts.push(
        request('/api/auth/signin', {
          method: 'POST',
          body: { email: 'nobody@ontrack.test', password: 'nope' },
          headers: { 'X-Forwarded-For': '198.51.100.7' },
        })
      )
    }
    const responses = await Promise.all(attempts)
    expect(responses.some((response) => response.status === 429)).toBe(true)
  })
})
