// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/web/src/global/repositories/tasks.repository', () => ({
  listTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTask: vi.fn(),
  deleteTask: vi.fn(),
}))
vi.mock('../../apps/web/src/global/repositories/appointments.repository', () => ({
  listAppointments: vi.fn().mockResolvedValue([]),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}))
vi.mock('../../apps/web/src/global/repositories/diary.repository', () => ({
  loadDiary: vi.fn().mockResolvedValue({ entries: [], hasMore: false }),
  createDiary: vi.fn(),
  updateDiary: vi.fn(),
  deleteDiary: vi.fn(),
  unlockDiary: vi.fn(),
}))
vi.mock('../../apps/web/src/global/repositories/agents.repository', () => ({
  listAgents: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../apps/web/src/global/repositories/messages.repository', () => ({
  listMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false, unreadCount: 0 }),
}))

import { CommandPalette } from '../../apps/web/src/features/search/CommandPalette'
import { useNotesStore } from '../../apps/web/src/global/stores/useNotesStore'
import { useCalendarStore } from '../../apps/web/src/global/stores/useCalendarStore'
import { useDiaryStore } from '../../apps/web/src/global/stores/useDiaryStore'
import { useAgentsStore } from '../../apps/web/src/global/stores/useAgentsStore'
import { useAgentMessagesStore } from '../../apps/web/src/global/stores/useAgentMessagesStore'

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

beforeEach(() => {
  useNotesStore.setState({ board: { todo: [], doing: [], done: [] }, loadStatus: 'loaded', epoch: 0 })
  useCalendarStore.setState({ appointments: [], loadStatus: 'loaded', epoch: 0 })
  useDiaryStore.setState({
    entries: [],
    hasMore: false,
    loadStatus: 'loaded',
    activeMonth: null,
    epoch: 0,
  })
  useAgentsStore.setState({
    agents: [],
    templates: [],
    loadStatus: 'loaded',
    templatesLoadStatus: 'loaded',
    epoch: 0,
    runningAgentId: null,
  })
  useAgentMessagesStore.setState({
    messages: [],
    hasMore: false,
    unreadCount: 0,
    loadStatus: 'loaded',
    offset: 0,
    epoch: 0,
  })
})

describe('CommandPalette', () => {
  it('finds a task and navigates to Notes', async () => {
    useNotesStore.setState({
      board: {
        todo: [
          {
            id: 'task-1',
            title: 'Write the regression test',
            text: '',
            priority: 'medium',
            dueDate: null,
            createdAt: Date.now(),
            doneAt: null,
          },
        ],
        doing: [],
        done: [],
      },
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <CommandPalette open onClose={() => {}} />
        <LocationProbe />
      </MemoryRouter>
    )

    const input = screen.getByRole('textbox', { name: 'Search OnTrack' })
    await user.type(input, 'regression')
    await user.click(screen.getByText('Write the regression test'))
    expect(screen.getByTestId('location')).toHaveTextContent('/notes')
  })

  it('navigates to a page from the palette', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <CommandPalette open onClose={() => {}} />
        <LocationProbe />
      </MemoryRouter>
    )

    await user.type(screen.getByRole('textbox', { name: 'Search OnTrack' }), 'timer')
    await user.click(screen.getByText('Timer'))
    expect(screen.getByTestId('location')).toHaveTextContent('/timer')
  })
})
