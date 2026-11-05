import { describe, expect, it } from 'vitest'
import { createUser, createVerifiedSession, db, request, signIn } from './db'

const agentInput = {
  name: 'Test Agent',
  role: 'Summarizer',
  icon: 'brain',
  color: '#8b5cf6',
  description: 'Summarize things.',
  preferences: [],
  sources: [],
  output: ['message'],
  draftOnly: true,
  maxTokens: 2000,
}

describe('agents API', () => {
  it('persists the selected tool set through create and update', async () => {
    const { session } = await createVerifiedSession()
    const created = await request('/api/agents', {
      method: 'POST',
      token: session.accessToken,
      body: { ...agentInput, tools: ['news_read'] },
    })
    expect(created.status).toBe(201)
    const agent = (await created.json()).data
    expect(agent.tools.map((tool: { toolName: string }) => tool.toolName)).toEqual(['news_read'])

    const updated = await request(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      token: session.accessToken,
      body: { tools: ['summarize'] },
    })
    expect(updated.status).toBe(200)

    const tools = await request(`/api/tools/agents/${agent.id}/tools`, {
      token: session.accessToken,
    })
    const rows = (await tools.json()).data
    expect(rows.find((row: { toolName: string }) => row.toolName === 'summarize').enabled).toBe(true)
    expect(rows.find((row: { toolName: string }) => row.toolName === 'news_read').enabled).toBe(false)
  })

  it('scopes tool and agent routes to the owner', async () => {
    const owner = await createVerifiedSession()
    const stranger = await createVerifiedSession()
    const created = await request('/api/agents', {
      method: 'POST',
      token: owner.session.accessToken,
      body: agentInput,
    })
    const agent = (await created.json()).data

    const tools = await request(`/api/tools/agents/${agent.id}/tools`, {
      token: stranger.session.accessToken,
    })
    expect(tools.status).toBe(404)

    const edit = await request(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      token: stranger.session.accessToken,
      body: { name: 'Hijack' },
    })
    expect(edit.status).toBe(404)
  })

  it('rejects a model key owned by another user', async () => {
    const owner = await createUser()
    const stranger = await createVerifiedSession()
    const key = await db.modelKey.create({
      data: {
        userId: owner.id,
        provider: 'openrouter',
        label: 'Owner key',
        apiKeyEnc: 'iv:ciphertext',
        defaultModel: 'openai/gpt-4o-mini',
      },
    })

    const created = await request('/api/agents', {
      method: 'POST',
      token: stranger.session.accessToken,
      body: { ...agentInput, modelKeyId: key.id },
    })
    expect(created.status).toBe(404)
  })

  it('rejects unknown tool names', async () => {
    const { session } = await createVerifiedSession()
    const created = await request('/api/agents', {
      method: 'POST',
      token: session.accessToken,
      body: { ...agentInput, tools: ['drop_database'] },
    })
    expect(created.status).toBe(400)
  })

  it('serves plan-aware usage', async () => {
    const user = await createUser()
    const session = await signIn(user.email, user.password)
    const response = await request('/api/agents/usage', { token: session.accessToken })
    expect(response.status).toBe(200)
    const usage = (await response.json()).data
    expect(usage.plan).toBe('free')
    expect(usage.dailyRunLimit).toBe(50)
    expect(usage.monthlyTokenLimit).toBe(500_000)
  })
})
