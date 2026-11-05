import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const appSource = await readFile('apps/web/src/App.tsx', 'utf8')
const appLayoutSource = await readFile('apps/web/src/AppLayout.tsx', 'utf8')
const mainSource = await readFile('apps/web/src/main.tsx', 'utf8')
const modalSource = await readFile('apps/web/src/global/ui/Modal.tsx', 'utf8')
const menuSource = await readFile('apps/web/src/global/lib/menu.ts', 'utf8')
const indexCssSource = await readFile('apps/web/src/index.css', 'utf8')
const fontsCssSource = await readFile('apps/web/src/fonts.css', 'utf8')
const viteConfigSource = await readFile('apps/web/vite.config.ts', 'utf8')
const settingsPageSource = await readFile('apps/web/src/features/settings/SettingsPage.tsx', 'utf8')
const searchSource = await readFile('apps/web/src/features/search/CommandPalette.tsx', 'utf8')
const onboardingSource = await readFile('apps/web/src/features/onboarding/OnboardingModal.tsx', 'utf8')
const timerSource = await readFile('apps/web/src/features/timer/TimerPage.tsx', 'utf8')
const loggerSource = await readFile('apps/backend/src/lib/logger.ts', 'utf8')
const backendIndexSource = await readFile('apps/backend/src/index.ts', 'utf8')
const dbSource = await readFile('apps/backend/src/db.ts', 'utf8')
const authControllerSource = await readFile('apps/backend/src/controllers/auth.controller.ts', 'utf8')
const authRouterSource = await readFile('apps/backend/src/routes/auth.router.ts', 'utf8')
const authServiceSource = await readFile('apps/backend/src/services/auth.service.ts', 'utf8')

test('app has a 404 route and a render error boundary', () => {
  assert.match(appSource, /NotFoundPage/)
  assert.match(appSource, /path="\*" element=\{<NotFoundPage \/>\}/)
  assert.match(mainSource, /<ErrorBoundary>/)
  assert.match(mainSource, /reducedMotion="user"/)
})

test('routes are lazy-loaded with a suspense fallback', () => {
  assert.match(appSource, /lazy\(/)
  assert.match(appSource, /<Suspense fallback=/)
  assert.match(appSource, /SettingsPage/)
})

test('modals are focus-trapped, labelled, and scroll-locked', () => {
  assert.match(modalSource, /role="dialog"/)
  assert.match(modalSource, /aria-modal="true"/)
  assert.match(modalSource, /aria-labelledby=\{titleId\}/)
  assert.match(modalSource, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(modalSource, /event\.key !== 'Tab'/)
  assert.match(modalSource, /previouslyFocused\?\.focus\(\)/)
})

test('menus support escape and roving arrow keys', () => {
  assert.match(menuSource, /export function useEscape/)
  assert.match(menuSource, /event\.key === 'ArrowDown'/)
  assert.match(menuSource, /event\.key === 'ArrowUp'/)
})

test('themes expose an on-accent token and reduced-motion rules', () => {
  assert.match(indexCssSource, /--on-accent:/)
  assert.match(indexCssSource, /prefers-reduced-motion: reduce/)
  assert.match(indexCssSource, /animation-duration: 0\.01ms !important/)
})

test('fonts are self-hosted and CSP no longer allows Google Fonts', () => {
  assert.doesNotMatch(indexCssSource, /fonts\.googleapis\.com/)
  assert.match(indexCssSource, /@import '\.\/fonts\.css'/)
  assert.match(fontsCssSource, /assets\/fonts\/.*\.woff2/)
  assert.doesNotMatch(viteConfigSource, /fonts\.googleapis\.com/)
  assert.match(viteConfigSource, /manualChunks/)
})

test('theme is applied before React mounts', async () => {
  const html = await readFile('apps/web/index.html', 'utf8')
  assert.match(html, /theme-init\.js/)
})

test('settings exposes profile, password, export, and delete', () => {
  assert.match(settingsPageSource, /updateProfile/)
  assert.match(settingsPageSource, /changePassword/)
  assert.match(settingsPageSource, /exportAccount/)
  assert.match(settingsPageSource, /deleteAccount/)
  assert.match(authRouterSource, /delete\('\/me'/)
  assert.match(authRouterSource, /get\('\/export'/)
  assert.match(authServiceSource, /export async function exportAccount/)
  assert.match(authServiceSource, /export async function deleteAccount/)
  assert.match(authControllerSource, /handleDeleteAccount/)
})

test('global search is wired to Ctrl/Cmd+K and the stores', () => {
  assert.match(appLayoutSource, /<CommandPalette open=\{searchOpen\}/)
  assert.match(appLayoutSource, /event\.key\.toLowerCase\(\) === 'k'/)
  assert.match(searchSource, /useNotesStore/)
  assert.match(searchSource, /useCalendarStore/)
  assert.match(searchSource, /useDiaryStore/)
  assert.match(searchSource, /useAgentsStore/)
})

test('onboarding is shown once per account', () => {
  assert.match(appLayoutSource, /OnboardingModal/)
  assert.match(appLayoutSource, /ontrack-onboarding:/)
  assert.match(onboardingSource, /addTask/)
  assert.match(onboardingSource, /setMinutes/)
})

test('timer warning follows endAt and permissions are checked', () => {
  assert.match(timerSource, /timer\.endAt - Date\.now\(\) - 5_000/)
  assert.match(timerSource, /Notification\.permission === 'denied'/)
  assert.match(timerSource, /if \(timer\.soundOn\) playChime/)
  assert.match(timerSource, /if \(timer\.soundOn\) playChime\(3\)/)
})

test('backend logs structured events with request ids and a health route', () => {
  assert.match(loggerSource, /export function log/)
  assert.match(loggerSource, /JSON\.stringify/)
  assert.match(backendIndexSource, /crypto\.randomUUID\(\)/)
  assert.match(backendIndexSource, /X-Request-Id/)
  assert.match(backendIndexSource, /app\.get\('\/health'/)
  assert.match(backendIndexSource, /Access-Control-Expose-Headers/)
})

test('database prefers a Hyperdrive binding when present', () => {
  assert.match(dbSource, /env\.HYPERDRIVE\?\.connectionString \?\? env\.DATABASE_URL/)
  assert.match(dbSource, /export function prismaClient\(env: Env\)/)
})

test('the workspace lint config resolves without the missing package link', async () => {
  const webConfig = await readFile('apps/web/eslint.config.js', 'utf8')
  const appConfig = await readFile('apps/app/eslint.config.mjs', 'utf8')
  assert.match(webConfig, /\.\.\/\.\.\/packages\/eslint-config-turbotron/)
  assert.match(appConfig, /\.\.\/\.\.\/packages\/eslint-config-turbotron/)
})
