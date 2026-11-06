import { expect, test } from '@playwright/test'
import { signInAndOpen } from './auth'

test('creates a note and keeps it after reload', async ({ page, request }) => {
  await signInAndOpen(page, request, '/notes')
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()

  await page.getByRole('button', { name: 'Add note' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('E2E persisted note')
  await dialog.getByRole('button', { name: 'Add note' }).click()

  await expect(page.getByText('E2E persisted note')).toBeVisible()
  await page.reload()
  await expect(page.getByText('E2E persisted note')).toBeVisible()
})

test('adds a calendar appointment', async ({ page, request }) => {
  await signInAndOpen(page, request, '/calendar')
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()

  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('menuitem', { name: 'Appointment' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('E2E appointment')
  await dialog.getByRole('button', { name: 'Add appointment' }).click()

  await expect(page.getByText('E2E appointment', { exact: true })).toBeVisible()
})

test('hides a diary entry and unlocks it with the account password', async ({ page, request }) => {
  await signInAndOpen(page, request, '/diary/new')
  await expect(page.getByPlaceholder('Title')).toBeVisible()

  await page.getByPlaceholder('Title').fill('E2E private entry')
  await page
    .getByPlaceholder('No rules. Write it how it actually felt.')
    .fill('This is the secret E2E body.')
  await page.getByRole('switch', { name: /Keep private/i }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Hidden entry').first()).toBeVisible()
  await page.getByText('Hidden entry').first().click()
  await page.getByLabel('Account password').fill('e2e-password-123')
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()

  await expect(page.getByText('This is the secret E2E body.')).toBeVisible()
})

test('opens the command palette and navigates to Timer', async ({ page, request }) => {
  await signInAndOpen(page, request, '/')
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()

  await page.keyboard.press('Control+K')
  const dialog = page.getByRole('dialog', { name: 'Search OnTrack' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Search OnTrack' }).fill('timer')
  await dialog.getByRole('button', { name: /^Timer/ }).click()

  await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible()
})
