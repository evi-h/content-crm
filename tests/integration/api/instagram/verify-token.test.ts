import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/mocks/server'

vi.mock('@/lib/supabase-server')

import { POST } from '@/app/api/instagram/verify-token/route'
import { createClient } from '@/lib/supabase-server'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/instagram/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeMockSupabase(user: { id: string; email: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

const authedUser = { id: 'user-1', email: 'a@b.com' }

describe('POST /api/instagram/verify-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth session', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never)
    const res = await POST(makeRequest({ access_token: 'valid-test-token' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when body is invalid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const req = new NextRequest('http://localhost/api/instagram/verify-token', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when access_token is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns { valid: true, ig_user_id, ig_username } for valid token', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ access_token: 'valid-test-token' }))
    const json = await res.json()
    expect(json.valid).toBe(true)
    expect(json.ig_user_id).toBe('ig_user_456')
    expect(json.ig_username).toBe('testbusiness')
  })

  it('returns { valid: false, error } for invalid token', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ access_token: 'invalid-token' }))
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.error).toBeTruthy()
    expect(JSON.stringify(json)).not.toContain('invalid-token')
  })

  it('returns { valid: false } for personal account', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ access_token: 'personal-token' }))
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.error).toContain('Personal')
  })

  it('does not include the access token in any error response', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)

    server.use(
      http.get('https://graph.instagram.com/v21.0/me', () =>
        HttpResponse.json({
          error: { message: 'Token error', code: 190 },
        })
      )
    )

    const res = await POST(makeRequest({ access_token: 'secret-token-xyz' }))
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('secret-token-xyz')
  })
})
