import { describe, expect, it } from 'vitest'
import { createVerifiedSession, db, request } from './db'

describe('agent inbox', () => {
  it('returns an accurate unread count independent of page size', async () => {
    const { session } = await createVerifiedSession()
    const agentResponse = await request('/api/agents', {
      method: 'POST',
      token: session.accessToken,
      body: {
        name: 'Inbox Agent',
        role: 'Listener',
        icon: 'brain',
        color: '#8b5cf6',
        description: 'Writes messages.',
        output: ['message'],
      },
    })
    const agent = (await agentResponse.json()).data

    for (let index = 0; index < 3; index += 1) {
      await db.agentMessage.create({
        data: {
          userId: session.user.id,
          agentId: agent.id,
          title: `Message ${index}`,
          body: 'Hello',
          read: index === 0,
        },
      })
    }

    const list = await request('/api/agents/messages?limit=1', { token: session.accessToken })
    expect(list.status).toBe(200)
    const body = (await list.json()).data
    expect(body.messages).toHaveLength(1)
    expect(body.hasMore).toBe(true)
    expect(body.unreadCount).toBe(2)
  })

  it('scopes messages to the owner', async () => {
    const owner = await createVerifiedSession()
    const stranger = await createVerifiedSession()
    const agentResponse = await request('/api/agents', {
      method: 'POST',
      token: owner.session.accessToken,
      body: {
        name: 'Private Agent',
        role: 'Listener',
        icon: 'brain',
        color: '#8b5cf6',
        description: 'Writes messages.',
        output: ['message'],
      },
    })
    const agent = (await agentResponse.json()).data
    const message = await db.agentMessage.create({
      data: { userId: owner.session.user.id, agentId: agent.id, title: 'Private', body: 'x' },
    })

    const denied = await request(`/api/agents/messages/${message.id}`, {
      method: 'PATCH',
      token: stranger.session.accessToken,
      body: { read: true },
    })
    expect(denied.status).toBe(404)
  })
})
