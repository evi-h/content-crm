export type BrandTone = 'professional' | 'casual' | 'playful' | 'bold'
export type PostStatus = 'draft' | 'scheduled' | 'published'
export type Platform = 'instagram'

export interface Business {
  id: string
  user_id: string
  name: string
  instagram_handle: string | null
  logo_url: string | null
  industry: string | null
  brand_tone: BrandTone | null
  brand_voice_notes: string | null
  color: string | null
  created_at: string
}

export interface InstagramConnection {
  id: string
  user_id: string
  business_id: string
  ig_user_id: string
  ig_username: string | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
  // access_token intentionally omitted — server only
}

export interface Post {
  id: string
  business_id: string
  caption: string | null
  image_url: string | null
  platform: Platform
  scheduled_at: string | null
  status: PostStatus
  brief: string | null
  created_at: string
}
