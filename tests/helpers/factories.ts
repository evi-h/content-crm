import type { Business, Post, InstagramConnection } from '@/types'

let idCounter = 0
function uid() {
  return `test-id-${++idCounter}`
}

export function createBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: uid(),
    user_id: 'user-123',
    name: 'Test Business',
    instagram_handle: '@testbusiness',
    logo_url: null,
    industry: 'Technology',
    brand_tone: 'casual',
    brand_voice_notes: null,
    color: '#6366f1',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: uid(),
    business_id: 'biz-123',
    caption: 'Test caption #test',
    image_url: 'https://example.com/image.jpg',
    platform: 'instagram',
    scheduled_at: '2026-06-01T12:00:00.000Z',
    status: 'scheduled',
    brief: 'Promote our new product',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createInstagramConnection(
  overrides: Partial<InstagramConnection> = {}
): InstagramConnection {
  return {
    id: uid(),
    user_id: 'user-123',
    business_id: 'biz-123',
    ig_user_id: 'ig_user_456',
    ig_username: 'testbusiness',
    token_expires_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    ...overrides,
  }
}
