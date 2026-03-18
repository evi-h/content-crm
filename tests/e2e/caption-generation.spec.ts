import { test, expect } from '@playwright/test'

test.describe('Caption generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock business fetch
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

    // Mock posts fetch
    await page.route('**/rest/v1/posts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock caption generation API
    await page.route('**/api/generate-caption', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Mocked caption for Acme Coffee ☕ #coffee #acme #test',
      })
    })

    await page.goto('/dashboard/biz-1')
  })

  test('generated caption appears in UI after triggering generation', async ({ page }) => {
    // Find the brief textarea and fill it
    const briefInput = page.getByPlaceholder(/brief/i).or(page.getByLabel(/brief/i)).first()
    await briefInput.fill('Promote our new seasonal latte')

    // Click generate button
    const generateBtn = page
      .getByRole('button', { name: /generate/i })
      .or(page.getByText(/generate/i))
      .first()
    await generateBtn.click()

    // Caption should appear in the textarea or caption area
    await expect(page.getByText('Mocked caption for Acme Coffee')).toBeVisible({ timeout: 5000 })
  })
})
