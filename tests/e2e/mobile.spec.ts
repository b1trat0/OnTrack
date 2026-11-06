import { expect, test } from '@playwright/test'
import { signInAndOpen } from './auth'

test('mobile search reaches Timer', async ({ page, request }) => {
  await signInAndOpen(page, request, '/')
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: /Search OnTrack/i }).click()
  const dialog = page.getByRole('dialog', { name: 'Search OnTrack' })
  await dialog.getByRole('textbox', { name: 'Search OnTrack' }).fill('timer')
  await dialog.getByRole('button', { name: /^Timer/ }).click()

  await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible()
})
