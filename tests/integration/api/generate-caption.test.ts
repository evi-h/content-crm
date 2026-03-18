import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoist mocks before imports
vi.mock('@/lib/supabase-server')
vi.mock('@/lib/claude', () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/generate-caption/route'
import { createClient } from '@/lib/supabase-server'
import { anthropic } from '@/lib/claude'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/generate-caption', {
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

async function* mockStream(text: string) {
  yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
}

describe('POST /api/generate-caption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth session', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never)
    const res = await POST(makeRequest({ brief: 'test', businessName: 'Biz' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when brief is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    const res = await POST(makeRequest({ businessName: 'Biz' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when businessName is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    const res = await POST(makeRequest({ brief: 'Promote product' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    const req = new NextRequest('http://localhost/api/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with text/plain content-type on valid request', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    vi.mocked(anthropic.messages.create).mockResolvedValue(
      mockStream('Great caption! #test') as never
    )
    const res = await POST(makeRequest({ brief: 'Promote product', businessName: 'Biz' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
  })

  it('response body contains generated caption text', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    vi.mocked(anthropic.messages.create).mockResolvedValue(
      mockStream('Generated caption here') as never
    )
    const res = await POST(makeRequest({ brief: 'Promote product', businessName: 'Biz' }))
    const text = await res.text()
    expect(text).toContain('Generated caption here')
  })

  it('returns 500 when Anthropic throws', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ id: 'user-1', email: 'a@b.com' }) as never
    )
    vi.mocked(anthropic.messages.create).mockRejectedValue(new Error('Anthropic API error'))
    const res = await POST(makeRequest({ brief: 'Promote product', businessName: 'Biz' }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })
})
