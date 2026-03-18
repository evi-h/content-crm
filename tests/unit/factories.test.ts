import { describe, it, expect } from 'vitest'
import { createBusiness, createPost, createInstagramConnection, createUser } from '@/tests/helpers/factories'

describe('factories', () => {
  it('createBusiness produces a valid Business shape', () => {
    const biz = createBusiness()
    expect(biz).toHaveProperty('id')
    expect(biz).toHaveProperty('user_id')
    expect(biz).toHaveProperty('name')
    expect(biz).toHaveProperty('instagram_handle')
    expect(biz).toHaveProperty('logo_url')
    expect(biz).toHaveProperty('industry')
    expect(biz).toHaveProperty('brand_tone')
    expect(biz).toHaveProperty('brand_voice_notes')
    expect(biz).toHaveProperty('color')
    expect(biz).toHaveProperty('created_at')
  })

  it('createBusiness applies overrides', () => {
    const biz = createBusiness({ name: 'Override Name', industry: null })
    expect(biz.name).toBe('Override Name')
    expect(biz.industry).toBeNull()
  })

  it('createPost produces a valid Post shape', () => {
    const post = createPost()
    expect(post).toHaveProperty('id')
    expect(post).toHaveProperty('business_id')
    expect(post).toHaveProperty('caption')
    expect(post).toHaveProperty('image_url')
    expect(post).toHaveProperty('platform')
    expect(post).toHaveProperty('scheduled_at')
    expect(post).toHaveProperty('status')
    expect(post).toHaveProperty('brief')
    expect(post).toHaveProperty('created_at')
    expect(post.platform).toBe('instagram')
  })

  it('createInstagramConnection produces a valid shape', () => {
    const conn = createInstagramConnection()
    expect(conn).toHaveProperty('id')
    expect(conn).toHaveProperty('user_id')
    expect(conn).toHaveProperty('business_id')
    expect(conn).toHaveProperty('ig_user_id')
    expect(conn).toHaveProperty('ig_username')
    expect(conn).toHaveProperty('token_expires_at')
    expect(conn).toHaveProperty('created_at')
    expect(conn).toHaveProperty('updated_at')
  })

  it('createUser produces a valid shape', () => {
    const user = createUser()
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
  })

  it('factories produce unique IDs', () => {
    const a = createBusiness()
    const b = createBusiness()
    expect(a.id).not.toBe(b.id)
  })
})
