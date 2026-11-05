import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  CalendarDays,
  FileText,
  Home,
  Search,
  Settings,
  StickyNote,
  Timer,
} from 'lucide-react'
import { useNotesStore } from '../../global/stores/useNotesStore'
import { useCalendarStore } from '../../global/stores/useCalendarStore'
import { useDiaryStore } from '../../global/stores/useDiaryStore'
import { useAgentsStore } from '../../global/stores/useAgentsStore'
import { useAgentMessagesStore } from '../../global/stores/useAgentMessagesStore'
import { Modal } from '../../global/ui/Modal'

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

type Result = {
  id: string
  label: string
  hint: string
  icon: typeof Home
  run: () => void
}

const PAGES: Array<{ label: string; path: string; icon: typeof Home }> = [
  { label: 'Today', path: '/', icon: Home },
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Notes', path: '/notes', icon: StickyNote },
  { label: 'Agents', path: '/agents', icon: Bot },
  { label: 'Diary', path: '/diary', icon: FileText },
  { label: 'Timer', path: '/timer', icon: Timer },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const board = useNotesStore((state) => state.board)
  const ensureNotes = useNotesStore((state) => state.ensureLoaded)
  const appointments = useCalendarStore((state) => state.appointments)
  const ensureCalendar = useCalendarStore((state) => state.ensureLoaded)
  const diary = useDiaryStore((state) => state.entries)
  const ensureDiary = useDiaryStore((state) => state.ensureLoaded)
  const agents = useAgentsStore((state) => state.agents)
  const ensureAgents = useAgentsStore((state) => state.ensureLoaded)
  const messages = useAgentMessagesStore((state) => state.messages)
  const ensureMessages = useAgentMessagesStore((state) => state.ensureLoaded)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    void ensureNotes()
    void ensureCalendar()
    void ensureDiary()
    void ensureAgents()
    void ensureMessages()
  }, [open, ensureNotes, ensureCalendar, ensureDiary, ensureAgents, ensureMessages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (value: string) => !q || value.toLowerCase().includes(q)
    const out: Result[] = []

    for (const page of PAGES) {
      if (matches(page.label)) {
        out.push({
          id: `page:${page.path}`,
          label: page.label,
          hint: 'Page',
          icon: page.icon,
          run: () => navigate(page.path),
        })
      }
    }

    for (const [status, tasks] of Object.entries(board)) {
      for (const task of tasks) {
        if (!matches(task.title) && !matches(task.text)) continue
        out.push({
          id: `task:${task.id}`,
          label: task.title,
          hint: `Task · ${status === 'todo' ? 'To Do' : status === 'doing' ? 'Doing' : 'Done'}`,
          icon: StickyNote,
          run: () => navigate('/notes'),
        })
      }
    }

    for (const appointment of appointments) {
      const text = `${appointment.title} ${appointment.notes} ${appointment.date}`
      if (!matches(text)) continue
      out.push({
        id: `appointment:${appointment.id}`,
        label: appointment.title,
        hint: `Calendar · ${appointment.date}`,
        icon: CalendarDays,
        run: () => navigate('/calendar'),
      })
    }

    for (const entry of diary) {
      const text = `${entry.title} ${entry.hidden ? '' : entry.content} ${entry.date}`
      if (!matches(text)) continue
      out.push({
        id: `diary:${entry.id}`,
        label: entry.hidden ? 'Hidden diary entry' : entry.title || 'Untitled diary entry',
        hint: `Diary · ${entry.date}`,
        icon: FileText,
        run: () => navigate(`/diary/${entry.id}`),
      })
    }

    for (const agent of agents) {
      if (!matches(`${agent.name} ${agent.role} ${agent.description}`)) continue
      out.push({
        id: `agent:${agent.id}`,
        label: agent.name,
        hint: `Agent · ${agent.role}`,
        icon: Bot,
        run: () => navigate('/agents'),
      })
    }

    for (const message of messages) {
      if (!matches(`${message.title} ${message.body}`)) continue
      out.push({
        id: `message:${message.id}`,
        label: message.title,
        hint: 'Agent inbox',
        icon: Bot,
        run: () => navigate('/agents'),
      })
    }

    return out.slice(0, 14)
  }, [query, board, appointments, diary, agents, messages, navigate])

  const move = (delta: number) => {
    if (results.length === 0) return
    setSelected((current) => (current + delta + results.length) % results.length)
  }

  const choose = (index: number) => {
    const result = results[index]
    if (!result) return
    result.run()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Search OnTrack" width="max-w-xl">
      <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface-2) px-3">
        <Search size={16} className="text-(--text-muted)" />
        <input
          ref={inputRef}
          data-autofocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              move(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              move(-1)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(selected)
            }
          }}
          placeholder="Search tasks, calendar, diary, agents…"
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--text-muted)"
          aria-label="Search OnTrack"
        />
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {results.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-(--text-muted)">
            Nothing matches “{query}”. Try a task title, date, or agent name.
          </p>
        ) : (
          results.map((result, index) => {
            const Icon = result.icon
            return (
              <button
                key={result.id}
                onClick={() => choose(index)}
                onMouseEnter={() => setSelected(index)}
                aria-selected={index === selected}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  index === selected ? 'bg-(--accent-soft) text-(--accent)' : 'hover:bg-(--surface-2)'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{result.label}</span>
                <span className="shrink-0 text-[11px] text-(--text-muted)">{result.hint}</span>
              </button>
            )
          })
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-(--text-muted)">
        ↑ ↓ to move · Enter to open · Esc to close
      </p>
    </Modal>
  )
}
