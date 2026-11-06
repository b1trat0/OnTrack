// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repo = vi.hoisted(() => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTask: vi.fn(),
  deleteTask: vi.fn(),
}))

vi.mock('../../apps/web/src/global/repositories/tasks.repository', () => repo)

import { useNotesStore } from '../../apps/web/src/global/stores/useNotesStore'

const emptyBoard = () => ({ todo: [], doing: [], done: [] })

beforeEach(() => {
  repo.listTasks.mockReset().mockResolvedValue([])
  repo.createTask.mockReset().mockResolvedValue({})
  repo.updateTask.mockReset().mockResolvedValue({})
  repo.moveTask.mockReset().mockResolvedValue({})
  repo.deleteTask.mockReset().mockResolvedValue(undefined)
  useNotesStore.setState({ board: emptyBoard(), loadStatus: 'idle', epoch: 0 })
})

describe('notes store', () => {
  it('adds a task optimistically and persists it once', async () => {
    useNotesStore.getState().addTask({
      title: 'Write the test',
      text: '',
      priority: 'medium',
      dueDate: null,
    })

    expect(useNotesStore.getState().board.todo).toHaveLength(1)
    expect(useNotesStore.getState().board.todo[0].title).toBe('Write the test')
    await vi.waitFor(() => expect(repo.createTask).toHaveBeenCalledTimes(1))
  })

  it('moves locally during drag and persists exactly once on drop', async () => {
    useNotesStore.getState().addTask({
      title: 'Drag me',
      text: '',
      priority: 'high',
      dueDate: null,
    })
    const id = useNotesStore.getState().board.todo[0].id

    useNotesStore.getState().moveTask(id, 'todo', 'doing', 0)
    expect(useNotesStore.getState().board.todo).toHaveLength(0)
    expect(useNotesStore.getState().board.doing[0].id).toBe(id)
    expect(repo.moveTask).not.toHaveBeenCalled()

    useNotesStore.getState().commitRowMove(id, 'doing', 0)
    await vi.waitFor(() => expect(repo.moveTask).toHaveBeenCalledWith(id, 'doing', 0))
  })

  it('toggles done and clears doneAt when moved back', async () => {
    useNotesStore.getState().addTask({
      title: 'Finish me',
      text: '',
      priority: 'low',
      dueDate: null,
    })
    const id = useNotesStore.getState().board.todo[0].id

    useNotesStore.getState().toggleDone(id)
    expect(useNotesStore.getState().board.done[0].doneAt).toBeTypeOf('number')
    await vi.waitFor(() => expect(repo.moveTask).toHaveBeenCalledWith(id, 'done'))

    useNotesStore.getState().toggleDone(id)
    expect(useNotesStore.getState().board.todo[0].doneAt).toBeNull()
  })

  it('shows an error instead of leaving the board loading forever', async () => {
    repo.listTasks.mockRejectedValueOnce(new Error('offline'))
    await useNotesStore.getState().ensureLoaded()
    expect(useNotesStore.getState().loadStatus).toBe('error')
  })
})
