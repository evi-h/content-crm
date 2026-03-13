import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { access_token: string; ig_user_id: string; ig_username: string; business_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { access_token, ig_user_id, ig_username, business_id } = body
  if (!access_token || !ig_user_id || !business_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify the user owns this business
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', business_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (bizError || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const { error } = await supabase.from('instagram_connections').upsert(
    {
      user_id: user.id,
      business_id,
      access_token,
      ig_user_id,
      ig_username: ig_username ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' }
  )

  if (error) {
    console.error('[connect]', error)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
