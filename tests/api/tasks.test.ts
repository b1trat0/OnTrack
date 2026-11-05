import { describe, expect, it } from 'vitest'
import { createVerifiedSession, request } from './db'

describe('tasks API', () => {
  it('creates, moves, and lists tasks with dense positions', async () => {
    const { session } = await createVerifiedSession()
    const create = (title: string) =>
      request('/api/tasks', {
        method: 'POST',
        token: session.accessToken,
        body: { title },
      })

    const first = (await (await create('First')).json()).data
    const second = (await (await create('Second')).json()).data
    expect(first.position).toBe(0)
    expect(second.position).toBe(1)

    const moved = await request(`/api/tasks/${first.id}/move`, {
      method: 'PATCH',
      token: session.accessToken,
      body: { to: 'doing', toIndex: 0 },
    })
    expect(moved.status).toBe(200)

    const list = await request('/api/tasks', { token: session.accessToken })
    const tasks = (await list.json()).data
    const doing = tasks.filter((task: { status: string }) => task.status === 'doing')
    expect(doing).toHaveLength(1)
    expect(doing[0].id).toBe(first.id)
    expect(doing[0].position).toBe(0)
  })

  it('densifies a column after delete', async () => {
    const { session } = await createVerifiedSession()
    const ids: string[] = []
    for (const title of ['A', 'B', 'C']) {
      const response = await request('/api/tasks', {
        method: 'POST',
        token: session.accessToken,
        body: { title },
      })
      ids.push((await response.json()).data.id)
    }

    const removed = await request(`/api/tasks/${ids[1]}`, {
      method: 'DELETE',
      token: session.accessToken,
    })
    expect(removed.status).toBe(204)

    const list = await request('/api/tasks', { token: session.accessToken })
    const tasks = (await list.json()).data
    expect(tasks.map((task: { position: number }) => task.position)).toEqual([0, 1])
  })

  it('does not let a user touch another user’s task', async () => {
    const owner = await createVerifiedSession()
    const stranger = await createVerifiedSession()
    const created = await request('/api/tasks', {
      method: 'POST',
      token: owner.session.accessToken,
      body: { title: 'Private' },
    })
    const task = (await created.json()).data

    const response = await request(`/api/tasks/${task.id}/move`, {
      method: 'PATCH',
      token: stranger.session.accessToken,
      body: { to: 'done' },
    })
    expect(response.status).toBe(404)
  })
})
