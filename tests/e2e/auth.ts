import type { APIRequestContext, Page } from '@playwright/test'

export const E2E_EMAIL = 'e2e@ontrack.test'
export const E2E_PASSWORD = 'e2e-password-123'

type SignInBody = {
  data: {
    refreshToken: string
    user: { id: string; email: string }
  }
}

/**
 * Sign in through the API, then inject the refresh token so the UI restores the
 * session without repeating the password form in every test.
 */
export async function signInAndOpen(
  page: Page,
  request: APIRequestContext,
  path = '/'
): Promise<void> {
  const response = await request.post('http://127.0.0.1:7891/api/auth/signin', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  })
  if (!response.ok()) {
    throw new Error(`E2E sign-in failed: ${response.status()} ${await response.text()}`)
  }
  const body = (await response.json()) as SignInBody
  await page.addInitScript(
    ({ refreshToken, userId }) => {
      // Do not overwrite on reload: the app rotates the refresh token on restore.
      if (!localStorage.getItem('ontrack-refresh-token')) {
        localStorage.setItem('ontrack-refresh-token', refreshToken)
      }
      localStorage.setItem(`ontrack-onboarding:${userId}`, '1')
    },
    { refreshToken: body.data.refreshToken, userId: body.data.user.id }
  )
  await page.goto(path === '/' ? '/#/' : `/#${path}`)
  await page.locator('header').first().waitFor({ timeout: 15_000 })
  await page.waitForFunction(() => Boolean(localStorage.getItem('ontrack-user')), null, {
    timeout: 15_000,
  })
}
