import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean; message: string }

/**
 * Catches render errors so a single bad component cannot blank the whole app.
 * The fallback keeps a recovery path without needing a full reinstall.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[ontrack] render error', error, info.componentStack)
  }

  private goHome = (): void => {
    window.location.hash = '#/'
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-(--bg) p-6 text-(--text)">
        <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-(--danger)">
            Something broke
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight">This page hit an error</h1>
          <p className="mt-2 text-sm text-(--text-muted)">
            Your data is safe. Reload the page, or go back to Today and try again.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-(--surface-2) p-3 text-xs text-(--text-muted)">
            {this.state.message}
          </pre>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-medium text-(--on-accent)"
            >
              Reload
            </button>
            <button
              onClick={this.goHome}
              className="rounded-xl bg-(--surface-2) px-4 py-2 text-sm font-medium text-(--text)"
            >
              Go to Today
            </button>
          </div>
        </div>
      </div>
    )
  }
}
