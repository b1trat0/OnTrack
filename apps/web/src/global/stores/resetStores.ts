import { useNotesStore } from './useNotesStore'
import { useCalendarStore } from './useCalendarStore'
import { useDiaryStore } from './useDiaryStore'
import { useAgentsStore } from './useAgentsStore'
import { useModelKeysStore } from './useModelKeysStore'
import { useAgentMessagesStore } from './useAgentMessagesStore'
import { useIntegrationsStore } from './useIntegrationsStore'
import { DEFAULT_PRESETS, useTimerStore } from './useTimerStore'
import { useToastStore } from './useToastStore'
import { useNotificationsStore } from './useNotificationsStore'

/**
 * Drops every user-owned slice from memory.
 *
 * Clearing localStorage alone is not enough: Zustand has already rehydrated
 * the values into the running app. Call this whenever the signed-in account
 * changes, signs out, or its session expires.
 */
export function resetUserStores(): void {
  useNotesStore.setState({
    board: { todo: [], doing: [], done: [] },
    loadStatus: 'idle',
    epoch: 0,
  })

  useCalendarStore.setState({
    appointments: [],
    loadStatus: 'idle',
    epoch: 0,
  })

  useDiaryStore.setState({
    entries: [],
    hasMore: false,
    loadStatus: 'idle',
    activeMonth: null,
    epoch: 0,
  })

  useAgentsStore.setState({
    agents: [],
    templates: [],
    loadStatus: 'idle',
    templatesLoadStatus: 'idle',
    epoch: 0,
    runningAgentId: null,
  })

  useModelKeysStore.setState({ keys: [], loadStatus: 'idle', epoch: 0 })

  useAgentMessagesStore.setState({
    messages: [],
    hasMore: false,
    unreadCount: 0,
    loadStatus: 'idle',
    offset: 0,
    epoch: 0,
  })

  useIntegrationsStore.setState({
    isGmailConnected: false,
    gmailEmail: null,
    isGmailLoading: false,
    isGmailConnecting: false,
    gmailError: null,
  })

  useTimerStore.setState({
    presets: DEFAULT_PRESETS,
    minutes: 25,
    status: 'idle',
    endAt: null,
    remainingMs: 25 * 60 * 1000,
    reminders: [],
    soundOn: true,
    notificationsOn: false,
  })

  useToastStore.setState({ toasts: [] })
  useNotificationsStore.setState({ seenIds: [] })
}
