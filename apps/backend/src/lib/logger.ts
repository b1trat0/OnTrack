type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const METHODS: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

/**
 * Structured, single-line logs so a Worker log search can filter by event.
 * Never pass tokens, keys, email bodies, or full user records as fields.
 */
export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  METHODS[level](JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields }))
}

export function requestLog(
  level: LogLevel,
  event: string,
  requestId: string | undefined,
  fields: Record<string, unknown> = {}
): void {
  log(level, event, { requestId: requestId ?? 'unknown', ...fields })
}
