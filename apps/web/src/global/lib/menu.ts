import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react'

/** Close a popover on Escape without coupling it to a specific menu markup. */
export function useEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

/**
 * Roving arrow-key navigation for role="menu" / role="listbox" containers.
 * Tab still leaves the menu normally; Escape is handled by useEscape.
 */
export function menuKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled]), [role="option"]:not([disabled])'
    )
  ).filter((item) => item.getClientRects().length > 0)
  if (items.length === 0) return

  const current = items.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    items[(current + 1 + items.length) % items.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    items[(current - 1 + items.length) % items.length]?.focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    items[0]?.focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    items[items.length - 1]?.focus()
  }
}
