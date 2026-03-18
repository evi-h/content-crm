import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server')

import { POST } from '@/app/api/instagram/connect/route'
import { createClient } from '@/lib/supabase-server'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/instagram/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const authedUser = { id: 'user-1', email: 'a@b.com' }

function makeMockSupabase(
  user: { id: string; email: string } | null,
  bizData: { id: string } | null = { id: 'biz-123' },
  upsertError: unknown = null
) {
  const maybeSingleFn = vi.fn().mockResolvedValue({ data: bizData, error: null })
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError })

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'businesses') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      }
    }
    if (table === 'instagram_connections') {
      return { upsert: upsertFn }
    }
    return {}
  })

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: fromFn,
    _upsert: upsertFn,
  }
}

describe('POST /api/instagram/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth session', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never)
    const res = await POST(
      makeRequest({ access_token: 'tok', ig_user_id: 'ig1', business_id: 'biz-1' })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when access_token is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ ig_user_id: 'ig1', business_id: 'biz-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when ig_user_id is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ access_token: 'tok', business_id: 'biz-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when business_id is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(makeRequest({ access_token: 'tok', ig_user_id: 'ig1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when user does not own the business', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser, null) as never)
    const res = await POST(
      makeRequest({ access_token: 'tok', ig_user_id: 'ig1', business_id: 'biz-1' })
    )
    expect(res.status).toBe(404)
  })

  it('returns 200 { success: true } on valid request', async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase(authedUser) as never)
    const res = await POST(
      makeRequest({ access_token: 'tok', ig_user_id: 'ig1', business_id: 'biz-123' })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('calls upsert with correct shape including user_id', async () => {
    const mock = makeMockSupabase(authedUser)
    vi.mocked(createClient).mockResolvedValue(mock as never)

    await POST(
      makeRequest({
        access_token: 'secret-token',
        ig_user_id: 'ig_456',
        ig_username: 'mybiz',
        business_id: 'biz-123',
      })
    )

    expect(mock._upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: authedUser.id,
        business_id: 'biz-123',
        access_token: 'secret-token',
        ig_user_id: 'ig_456',
        ig_username: 'mybiz',
      }),
      { onConflict: 'business_id' }
    )
  })
})
