import { describe, expect, it } from 'vitest'
import { createVerifiedSession, request } from './db'

describe('diary hidden entries', () => {
  it('strips hidden content, rejects a wrong password, and unlocks permanently', async () => {
    const { user, session } = await createVerifiedSession()
    const created = await request('/api/diary', {
      method: 'POST',
      token: session.accessToken,
      body: {
        title: 'Private',
        content: 'This is the secret body',
        mood: 'okay',
        tags: ['private'],
        date: '2026-11-05',
        hidden: true,
      },
    })
    const entry = (await created.json()).data
    expect(entry.content).toBe('')

    const list = await request('/api/diary?month=2026-11', { token: session.accessToken })
    const listed = (await list.json()).data.entries[0]
    expect(listed.content).toBe('')

    const wrong = await request('/api/diary/unlock', {
      method: 'POST',
      token: session.accessToken,
      body: { id: entry.id, password: 'wrong' },
    })
    expect(wrong.status).toBe(403)

    const unlocked = await request('/api/diary/unlock', {
      method: 'POST',
      token: session.accessToken,
      body: { id: entry.id, password: user.password },
    })
    expect(unlocked.status).toBe(200)
    expect((await unlocked.json()).data.content).toBe('This is the secret body')

    const after = await request('/api/diary?month=2026-11', { token: session.accessToken })
    expect((await after.json()).data.entries[0].content).toBe('This is the secret body')
  })
})

describe('appointments API', () => {
  it('creates and lists an appointment for the owner only', async () => {
    const { session } = await createVerifiedSession()
    const created = await request('/api/appointments', {
      method: 'POST',
      token: session.accessToken,
      body: {
        kind: 'appointment',
        title: 'Therapy',
        date: '2026-11-05',
        startTime: '15:00',
        endTime: '15:45',
        color: '#8b5cf6',
        notes: '',
      },
    })
    expect(created.status).toBe(201)
    const appointment = (await created.json()).data

    const list = await request('/api/appointments', { token: session.accessToken })
    const items = (await list.json()).data
    expect(items.some((item: { id: string }) => item.id === appointment.id)).toBe(true)

    const stranger = await createVerifiedSession()
    const denied = await request(`/api/appointments/${appointment.id}`, {
      method: 'DELETE',
      token: stranger.session.accessToken,
    })
    expect(denied.status).toBe(404)
  })
})
