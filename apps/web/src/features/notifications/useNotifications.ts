import { useEffect, useMemo } from 'react'
import { useNotesStore } from '../../global/stores/useNotesStore'
import { useCalendarStore } from '../../global/stores/useCalendarStore'
import { useAgentsStore } from '../../global/stores/useAgentsStore'
import { useAgentMessagesStore } from '../../global/stores/useAgentMessagesStore'
import { useTimerStore } from '../../global/stores/useTimerStore'
import { useNotificationsStore } from '../../global/stores/useNotificationsStore'
import { todayKey } from '../../global/lib/dates'

export type NotificationTone = 'info' | 'warn' | 'danger'

export type AppNotification = {
  id: string
  title: string
  body: string
  path: string
  tone: NotificationTone
  icon: 'task' | 'calendar' | 'agent' | 'timer'
}

export function useNotifications() {
  const board = useNotesStore((state) => state.board)
  const ensureNotes = useNotesStore((state) => state.ensureLoaded)
  const appointments = useCalendarStore((state) => state.appointments)
  const ensureCalendar = useCalendarStore((state) => state.ensureLoaded)
  const agents = useAgentsStore((state) => state.agents)
  const ensureAgents = useAgentsStore((state) => state.ensureLoaded)
  const messages = useAgentMessagesStore((state) => state.messages)
  const ensureMessages = useAgentMessagesStore((state) => state.ensureLoaded)
  const reminders = useTimerStore((state) => state.reminders)
  const seenIds = useNotificationsStore((state) => state.seenIds)
  const markSeen = useNotificationsStore((state) => state.markSeen)

  useEffect(() => {
    void ensureNotes()
    void ensureCalendar()
    void ensureAgents()
    void ensureMessages()
  }, [ensureNotes, ensureCalendar, ensureAgents, ensureMessages])

  const notifications = useMemo<AppNotification[]>(() => {
    const today = todayKey()
    const items: Array<AppNotification & { order: number }> = []
    const agentName = new Map(agents.map((agent) => [agent.id, agent.name]))

    for (const status of ['todo', 'doing'] as const) {
      for (const task of board[status]) {
        if (!task.dueDate) continue
        if (task.dueDate > today) continue
        const overdue = task.dueDate < today
        items.push({
          id: `task:${task.id}:${task.dueDate}`,
          title: overdue ? `Overdue: ${task.title}` : `Due today: ${task.title}`,
          body: overdue ? `Was due ${task.dueDate}.` : 'Still on your board for today.',
          path: '/notes',
          tone: overdue ? 'danger' : 'warn',
          icon: 'task',
          order: overdue ? 0 : 1,
        })
      }
    }

    for (const appointment of appointments) {
      if (appointment.date !== today) continue
      items.push({
        id: `appointment:${appointment.id}:${appointment.date}:${appointment.startTime}`,
        title: appointment.title,
        body:
          appointment.kind === 'birthday'
            ? 'All day today.'
            : `${appointment.startTime}${appointment.endTime ? ` – ${appointment.endTime}` : ''} today.`,
        path: '/calendar',
        tone: 'info',
        icon: 'calendar',
        order: 2,
      })
    }

    for (const message of messages.slice(0, 10)) {
      items.push({
        id: `message:${message.id}`,
        title: `Agent update: ${message.title}`,
        body: agentName.get(message.agentId) ?? 'Agent inbox',
        path: '/agents',
        tone: 'info',
        icon: 'agent',
        order: 3,
      })
    }

    for (const reminder of reminders) {
      items.push({
        id: `reminder:${reminder.id}:${reminder.level}`,
        title: reminder.message,
        body: `Focus reminder · level ${reminder.level}`,
        path: '/timer',
        tone: reminder.level >= 3 ? 'danger' : 'warn',
        icon: 'timer',
        order: 4,
      })
    }

    return items.sort((a, b) => a.order - b.order).slice(0, 25)
  }, [board, appointments, messages, reminders, agents])

  const seen = useMemo(() => new Set(seenIds), [seenIds])
  const unreadCount = notifications.filter((item) => !seen.has(item.id)).length

  return {
    notifications,
    unreadCount,
    isSeen: (id: string) => seen.has(id),
    markAllSeen: () => markSeen(notifications.map((item) => item.id)),
    markSeen: (id: string) => markSeen([id]),
  }
}
