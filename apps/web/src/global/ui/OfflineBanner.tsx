import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Honest offline state: cached pages read, but writes still need the API. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 border-t border-(--border) bg-(--surface) px-4 py-2 text-xs text-(--text-muted)"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <WifiOff size={13} />
      You are offline. Cached pages still open; new changes may not sync until you reconnect.
    </div>
  )
}
