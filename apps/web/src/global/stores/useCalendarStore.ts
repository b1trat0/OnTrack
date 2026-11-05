import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isAuthError, toErrorMessage } from '../lib/api'
import { uid } from '../lib/id'
import {
  createAppointment as createAppointmentRequest,
  deleteAppointment as deleteAppointmentRequest,
  listAppointments,
  updateAppointment as updateAppointmentRequest,
} from '../repositories/appointments.repository'
import { useToastStore } from './useToastStore'

export type CalendarEventKind = 'appointment' | 'birthday' | 'task'
export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

export type Appointment = {
  id: string
  kind: CalendarEventKind
  title: string
  date: string
  startTime: string
  endTime: string | null
  color: string
  notes: string
}

export const EVENT_COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Slate', value: '#64748b' },
]

export const TASK_EVENT_COLOR = '#f59e0b'

type CalendarState = CalendarStore & {
  /** Bumped on every local mutation; a stale in-flight fetch never overwrites newer state. */
  epoch: number
}

type CalendarStore = {
  appointments: Appointment[]
  loadStatus: LoadStatus
  ensureLoaded: () => Promise<void>
  /**
   * Re-read from the server, bypassing the `loadStatus` guard.
   *
   * Callers that wrote outside this store (an agent run, or the action-approval
   * modal) need this; `ensureLoaded` would short-circuit on `'loaded'` and leave
   * the board stale. Never seeds demo rows — a forced refetch of an intentionally
   * empty calendar must stay empty.
   */
  refresh: () => Promise<void>
  addAppointment: (appointment: Omit<Appointment, 'id'> & { id?: string }) => void
  updateAppointment: (id: string, patch: Partial<Omit<Appointment, 'id'>>) => void
  removeAppointment: (id: string) => void
}

function pushSyncError(error: unknown): void {
  if (isAuthError(error)) return
  useToastStore.getState().push({
    title: 'Couldn’t sync calendar',
    message: toErrorMessage(error),
    level: 'error',
  })
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      appointments: [],
      loadStatus: 'idle',
      epoch: 0,

      ensureLoaded: async () => {
        if (get().loadStatus === 'loading' || get().loadStatus === 'loaded') return
        set({ loadStatus: 'loading' })
        const epoch = get().epoch
        try {
          const remote = await listAppointments()
          if (get().epoch !== epoch) return
          // The server is the only source of truth. Local rows are never
          // uploaded here: that was how a previous account's calendar leaked
          // into the next account on the same device.
          set({ appointments: remote, loadStatus: 'loaded' })
        } catch (error) {
          if (get().epoch === epoch) set({ loadStatus: 'error' })
          pushSyncError(error)
        } finally {
          if (get().loadStatus === 'loading' && get().epoch !== epoch) {
            set({ loadStatus: 'idle' })
          }
        }
      },

      refresh: async () => {
        const epoch = get().epoch
        try {
          const remote = await listAppointments()
          if (get().epoch !== epoch) return
          set({ appointments: remote, loadStatus: 'loaded' })
        } catch (error) {
          pushSyncError(error)
        }
      },

      addAppointment: (appointment) => {
        const entry: Appointment = { ...appointment, id: appointment.id ?? uid(), kind: appointment.kind }
        set((state) => ({ appointments: [...state.appointments, entry], epoch: state.epoch + 1 }))
        void createAppointmentRequest(entry).catch((error) => {
          pushSyncError(error)
          void listAppointments().then((appointments) => set({ appointments }))
        })
      },

      updateAppointment: (id, patch) => {
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === id ? { ...appointment, ...patch, kind: patch.kind ?? appointment.kind } : appointment
          ),
          epoch: state.epoch + 1,
        }))
        void updateAppointmentRequest(id, patch).catch((error) => {
          pushSyncError(error)
          void listAppointments().then((appointments) => set({ appointments }))
        })
      },

      removeAppointment: (id) => {
        set((state) => ({
          appointments: state.appointments.filter((appointment) => appointment.id !== id),
          epoch: state.epoch + 1,
        }))
        void deleteAppointmentRequest(id).catch((error) => {
          pushSyncError(error)
          void listAppointments().then((appointments) => set({ appointments }))
        })
      },
    }),
    { name: 'ontrack-calendar', partialize: (state) => ({ appointments: state.appointments }) }
  )
)