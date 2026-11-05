import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { AuthGuard } from './features/auth/AuthGuard'

const DashboardWindow = lazy(() =>
  import('./features/dashboard/DashboardWindow').then((module) => ({ default: module.DashboardWindow }))
)
const TodayPage = lazy(() =>
  import('./features/today/TodayPage').then((module) => ({ default: module.TodayPage }))
)
const NotesPage = lazy(() =>
  import('./features/notes/NotesPage').then((module) => ({ default: module.NotesPage }))
)
const AgentsPage = lazy(() =>
  import('./features/agents/AgentsPage').then((module) => ({ default: module.AgentsPage }))
)
const DiaryPage = lazy(() =>
  import('./features/diary/DiaryPage').then((module) => ({ default: module.DiaryPage }))
)
const DiaryEntryPage = lazy(() =>
  import('./features/diary/DiaryEntryPage').then((module) => ({ default: module.DiaryEntryPage }))
)
const TimerPage = lazy(() =>
  import('./features/timer/TimerPage').then((module) => ({ default: module.TimerPage }))
)
const CalendarPage = lazy(() =>
  import('./features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage }))
)
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
)
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage }))
)
const PlansPage = lazy(() =>
  import('./features/plans/PlansPage').then((module) => ({ default: module.PlansPage }))
)
const SignInPage = lazy(() =>
  import('./features/auth/SignInPage').then((module) => ({ default: module.SignInPage }))
)
const SignUpPage = lazy(() =>
  import('./features/auth/SignUpPage').then((module) => ({ default: module.SignUpPage }))
)
const VerifyEmailPage = lazy(() =>
  import('./features/auth/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('./features/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  }))
)
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  }))
)
const NotFoundPage = lazy(() =>
  import('./features/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
)

const isWidgetWindow = new URLSearchParams(window.location.search).has('widget')

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <span className="text-sm text-(--text-muted)">Loading…</span>
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {isWidgetWindow ? (
            <Route path="*" element={<DashboardWindow />} />
          ) : (
            <>
              <Route path="sign-in" element={<SignInPage />} />
              <Route path="sign-up" element={<SignUpPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route element={<AuthGuard />}>
                <Route element={<AppLayout />}>
                  <Route index element={<TodayPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="agents" element={<AgentsPage />} />
                  <Route path="diary" element={<DiaryPage />} />
                  <Route path="diary/new" element={<DiaryEntryPage />} />
                  <Route path="diary/:id" element={<DiaryEntryPage />} />
                  <Route path="timer" element={<TimerPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="plans" element={<PlansPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </>
          )}
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
