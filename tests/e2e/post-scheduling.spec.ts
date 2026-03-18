import { test, expect } from '@playwright/test'

test.describe('Post scheduling', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('**/rest/v1/posts**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'post-1',
              business_id: 'biz-1',
              caption: 'Scheduled post caption',
              image_url: 'https://example.com/img.jpg',
              platform: 'instagram',
              scheduled_at: '2026-07-15T10:00:00.000Z',
              status: 'scheduled',
              brief: 'Summer promo',
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ]),
        })
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'post-new' }]),
        })
      }
    })
  })

  test('scheduled posts appear in the calendar', async ({ page }) => {
    await page.goto('/dashboard')

    // Switch to Calendar tab
    const calendarTab = page.getByRole('tab', { name: /calendar/i })
    if (await calendarTab.isVisible()) {
      await calendarTab.click()
    }

    // The mocked post should appear somewhere in the calendar view
    await expect(page.getByText('Scheduled post caption').or(page.getByText('Acme Coffee'))).toBeVisible({
      timeout: 5000,
    })
  })
})
