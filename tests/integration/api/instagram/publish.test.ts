import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/mocks/server'

vi.mock('@/lib/supabase-server')
vi.mock('@supabase/supabase-js')

import { POST } from '@/app/api/instagram/publish/route'
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/instagram/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const authedUser = { id: 'user-1', email: 'a@b.com' }

function makeAuthSupabase(user: { id: string; email: string } | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  }
}

function makeServiceSupabase(connData: { ig_user_id: string; access_token: string } | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: connData, error: null }),
    }),
  }
}

describe('POST /api/instagram/publish', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns 401 when no auth session', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(null) as never)
    const res = await POST(makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when business_id is missing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    const res = await POST(makeRequest({ image_url: 'https://img.com/a.jpg' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when image_url is missing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    const res = await POST(makeRequest({ business_id: 'biz-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when no Instagram connection found', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    vi.mocked(createSupabaseJsClient).mockReturnValue(makeServiceSupabase(null) as never)

    const res = await POST(makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg' }))
    expect(res.status).toBe(404)
  })

  it('returns { success: true, post_id } on successful publish', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    vi.mocked(createSupabaseJsClient).mockReturnValue(
      makeServiceSupabase({ ig_user_id: 'ig_456', access_token: 'tok' }) as never
    )

    const responsePromise = POST(
      makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg', caption: 'Hello' })
    )
    // Advance past the pollContainer setTimeout
    await vi.runAllTimersAsync()
    const res = await responsePromise

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.post_id).toBe('published_post_101')
  })

  it('returns 422 with mapped error when media create fails', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    vi.mocked(createSupabaseJsClient).mockReturnValue(
      makeServiceSupabase({ ig_user_id: 'ig_456', access_token: 'tok' }) as never
    )

    server.use(
      http.post('https://graph.instagram.com/v21.0/:userId/media', () =>
        HttpResponse.json({ error: { code: 190, message: 'Token expired.' } })
      )
    )

    const responsePromise = POST(
      makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg' })
    )
    await vi.runAllTimersAsync()
    const res = await responsePromise

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toContain('expired')
  })

  it('maps token expired error (code 190) to user-friendly message', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    vi.mocked(createSupabaseJsClient).mockReturnValue(
      makeServiceSupabase({ ig_user_id: 'ig_456', access_token: 'tok' }) as never
    )

    server.use(
      http.post('https://graph.instagram.com/v21.0/:userId/media', () =>
        HttpResponse.json({ error: { code: 190, message: 'Token expired.' } })
      )
    )

    const responsePromise = POST(
      makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg' })
    )
    await vi.runAllTimersAsync()
    const res = await responsePromise

    const json = await res.json()
    expect(json.error).toContain('token has expired')
    expect(json.error).toContain('Reconnect')
  })

  it('maps rate limit error to user-friendly message', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(makeAuthSupabase(authedUser) as never)
    vi.mocked(createSupabaseJsClient).mockReturnValue(
      makeServiceSupabase({ ig_user_id: 'ig_456', access_token: 'tok' }) as never
    )

    server.use(
      http.post('https://graph.instagram.com/v21.0/:userId/media', () =>
        HttpResponse.json({ error: { code: 4, message: 'Application request limit reached.' } })
      )
    )

    const responsePromise = POST(
      makeRequest({ business_id: 'biz-1', image_url: 'https://img.com/a.jpg' })
    )
    await vi.runAllTimersAsync()
    const res = await responsePromise

    const json = await res.json()
    expect(json.error).toContain('rate limit')
  })
})
