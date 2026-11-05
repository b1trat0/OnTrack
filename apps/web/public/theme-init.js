/**
 * Runs before React mounts so Night/Crazy users do not get a light flash.
 * It reads Zustand's persisted shape directly; failures fall back to the
 * default theme applied by CSS.
 */
(function applyStoredTheme() {
  try {
    var raw = localStorage.getItem('ontrack-theme')
    if (!raw) return
    var parsed = JSON.parse(raw)
    var theme = parsed && parsed.state && parsed.state.theme
    if (typeof theme === 'string' && theme) {
      document.documentElement.dataset.theme = theme
    }
  } catch {
    // A corrupt preference must never block the app from booting.
  }
})()
