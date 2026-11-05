import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CalendarDays, CheckCheck, StickyNote, Timer } from 'lucide-react'
import { useNotifications, type AppNotification } from './useNotifications'
import { menuKeyDown, useEscape } from '../../global/lib/menu'

const ICONS = {
  task: StickyNote,
  calendar: CalendarDays,
  agent: BellRing,
  timer: Timer,
} as const

const TONE: Record<AppNotification['tone'], string> = {
  info: 'text-(--text-muted)',
  warn: 'text-(--notes)',
  danger: 'text-(--danger)',
}

export function NotificationCentre() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { notifications, unreadCount, isSeen, markAllSeen, markSeen } = useNotifications()

  useEscape(open, () => setOpen(false))

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) markAllSeen()
  }

  const choose = (item: AppNotification) => {
    markSeen(item.id)
    setOpen(false)
    navigate(item.path)
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-(--text-muted) transition hover:bg-(--surface-2) hover:text-(--text)"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-(--danger) px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            onKeyDown={menuKeyDown}
            className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-(--border) bg-(--surface) p-2 shadow-xl"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-semibold text-(--text-muted)">Notifications</p>
              {notifications.length > 0 ? (
                <button
                  onClick={() => markAllSeen()}
                  className="flex items-center gap-1 text-[11px] font-medium text-(--accent) hover:underline"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-80 overflow-y-auto scroll-thin">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-(--text-muted)">
                  Nothing needs you right now.
                </p>
              ) : (
                notifications.map((item) => {
                  const Icon = ICONS[item.icon]
                  const seen = isSeen(item.id)
                  return (
                    <button
                      key={item.id}
                      role="menuitem"
                      onClick={() => choose(item)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-(--surface-2) ${
                        seen ? 'opacity-70' : ''
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${TONE[item.tone]}`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-(--text-muted)">
                          {item.body}
                        </span>
                      </span>
                      {!seen ? (
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>

            <p className="px-3 py-2 text-[11px] text-(--text-muted)">
              Due tasks, today&apos;s calendar, agent results, and focus reminders.
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}
