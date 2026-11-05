import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NotificationsState = {
  /** Stable notification ids the user has already seen. Capped to avoid growth. */
  seenIds: string[]
  markSeen: (ids: string[]) => void
  clearSeen: () => void
}

const MAX_SEEN = 300

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      seenIds: [],
      markSeen: (ids) => {
        const merged = new Set([...get().seenIds, ...ids])
        set({ seenIds: [...merged].slice(-MAX_SEEN) })
      },
      clearSeen: () => set({ seenIds: [] }),
    }),
    {
      name: 'ontrack-notifications',
      partialize: (state) => ({ seenIds: state.seenIds }),
    }
  )
)
