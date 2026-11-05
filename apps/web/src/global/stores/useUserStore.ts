import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearSession, SESSION_EXPIRED_EVENT_NAME } from '../lib/session'
import { syncActiveUser } from '../lib/userData'
import {
  deleteAccount as deleteAccountRequest,
  restoreUser,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  type AppUser,
} from '../repositories/auth.repository'
import { resetUserStores } from './resetStores'

export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut'

export type UserStore = {
  user: AppUser | null
  status: AuthStatus
  restoreSession: () => Promise<void>
  signUp: (input: { email: string; name: string; password: string }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  setUser: (user: AppUser) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      status: 'restoring',
      restoreSession: async () => {
        set({ status: 'restoring' })
        try {
          const user = await restoreUser()
          if (syncActiveUser(user.id)) resetUserStores()
          set({ user, status: 'signedIn' })
        } catch {
          set({ user: null, status: 'signedOut' })
        }
      },
      signUp: async (input) => {
        await signUpRequest(input)
        syncActiveUser(null)
        resetUserStores()
        set({ user: null, status: 'signedOut' })
      },
      signIn: async (email, password) => {
        const session = await signInRequest(email, password)
        if (syncActiveUser(session.user.id)) resetUserStores()
        set({ user: session.user, status: 'signedIn' })
      },
      signOut: async () => {
        try {
          await signOutRequest()
        } finally {
          clearSession()
          syncActiveUser(null)
          resetUserStores()
          set({ user: null, status: 'signedOut' })
        }
      },
      deleteAccount: async (password) => {
        await deleteAccountRequest(password)
        clearSession()
        syncActiveUser(null)
        resetUserStores()
        set({ user: null, status: 'signedOut' })
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'ontrack-user', partialize: (state) => ({ user: state.user }) }
  )
)

/**
 * Makes the store react to cross-window sign-outs and expired sessions
 * (e.g. refresh token rejected). Call once at startup.
 */
export function subscribeAuthEvents(): void {
  window.addEventListener(SESSION_EXPIRED_EVENT_NAME, () => {
    syncActiveUser(null)
    resetUserStores()
    useUserStore.setState({ user: null, status: 'signedOut' })
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== 'ontrack-user') return
    try {
      const stored = localStorage.getItem('ontrack-user')
      const parsed = stored ? JSON.parse(stored).state : null
      const nextUser: AppUser | null = parsed?.user ?? null
      const currentUser = useUserStore.getState().user
      // Another window may have switched accounts. localStorage is shared, but
      // this window's Zustand state is not, so reset it explicitly.
      if ((currentUser?.id ?? null) !== (nextUser?.id ?? null)) {
        resetUserStores()
      }
      syncActiveUser(nextUser?.id ?? null)
      useUserStore.setState({
        user: nextUser,
        status: nextUser ? 'signedIn' : 'signedOut',
      })
    } catch {
      localStorage.removeItem('ontrack-user')
      resetUserStores()
      useUserStore.setState({ user: null, status: 'signedOut' })
    }
  })
}