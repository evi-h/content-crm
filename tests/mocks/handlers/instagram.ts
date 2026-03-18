import { http, HttpResponse } from 'msw'

const VALID_TOKEN = 'valid-test-token'
const INVALID_TOKEN = 'invalid-token'

export const instagramHandlers = [
  // Verify token — GET /me
  http.get('https://graph.instagram.com/v21.0/me', ({ request }) => {
    const url = new URL(request.url)
    const token = url.searchParams.get('access_token') ?? ''

    if (token === INVALID_TOKEN) {
      return HttpResponse.json({
        error: { message: 'Invalid OAuth access token.', code: 190 },
      })
    }

    if (token === 'personal-token') {
      return HttpResponse.json({
        id: 'ig_123',
        username: 'testuser',
        account_type: 'PERSONAL',
      })
    }

    return HttpResponse.json({
      id: 'ig_user_456',
      username: 'testbusiness',
      account_type: 'BUSINESS',
    })
  }),

  // Create media container
  http.post('https://graph.instagram.com/v21.0/:userId/media', () => {
    return HttpResponse.json({ id: 'container_789' })
  }),

  // Poll container status
  http.get('https://graph.instagram.com/v21.0/:containerId', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('fields') === 'status_code') {
      return HttpResponse.json({ status_code: 'FINISHED' })
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),

  // Publish container
  http.post('https://graph.instagram.com/v21.0/:userId/media_publish', () => {
    return HttpResponse.json({ id: 'published_post_101' })
  }),
]
