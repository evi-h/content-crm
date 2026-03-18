import { test, expect } from '@playwright/test'

test.describe('Client management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth — intercept the session call
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          user: { id: 'user-1', email: 'test@example.com' },
        }),
      })
    })

    // Mock businesses list fetch
    await page.route('**/rest/v1/businesses**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'biz-1',
            user_id: 'user-1',
            name: 'Acme Coffee',
            instagram_handle: '@acmecoffee',
            logo_url: null,
            industry: 'Food & Beverage',
            brand_tone: 'casual',
            brand_voice_notes: null,
            color: '#6366f1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.goto('/dashboard')
  })

  test('client list is visible on dashboard', async ({ page }) => {
    await expect(page.getByText('Acme Coffee')).toBeVisible()
  })

  test('clicking a client opens its workspace', async ({ page }) => {
    await page.route('**/rest/v1/businesses?id=eq.biz-1**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'biz-1',
            user_id: 'user-1',
            name: 'Acme Coffee',
            instagram_handle: '@acmecoffee',
            logo_url: null,
            industry: 'Food & Beverage',
            brand_tone: 'casual',
            brand_voice_notes: null,
            color: '#6366f1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.getByText('Acme Coffee').click()
    await expect(page).toHaveURL(/\/dashboard\/biz-1/)
  })
})
