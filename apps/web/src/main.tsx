import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { App } from './App'
import { enableCrossWindowSync } from './global/lib/crossWindowSync'
import { syncActiveUser } from './global/lib/userData'
import { resetUserStores } from './global/stores/resetStores'
import { subscribeAuthEvents, useUserStore } from './global/stores/useUserStore'
import { ErrorBoundary } from './global/ui/ErrorBoundary'
import './index.css'

enableCrossWindowSync()
subscribeAuthEvents()

// The stores rehydrate from localStorage at import time. If the active account
// changed while the app was closed, drop the previous account's in-memory slice
// before the first render.
if (syncActiveUser(useUserStore.getState().user?.id ?? null)) resetUserStores()

void useUserStore.getState().restoreSession()

const root = document.querySelector('#root')
if (!root) throw new Error('Could not find root node')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
)
