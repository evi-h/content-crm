import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function mapInstagramError(err: { code?: number; message?: string }): string {
  const code = err.code
  const msg = err.message ?? ''
  if (code === 190) return 'Your Instagram token has expired. Reconnect in Settings.'
  if (code === 32 || code === 4 || msg.toLowerCase().includes('rate limit')) {
    return 'Instagram rate limit reached. Try again later.'
  }
  if (msg.toLowerCase().includes('image') || msg.toLowerCase().includes('url')) {
    return 'Image must be publicly accessible.'
  }
  return msg || 'Instagram publish failed. Please try again.'
}

async function pollContainer(
  containerId: string,
  igUserId: string,
  accessToken: string,
  maxAttempts = 10
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const url = new URL(`https://graph.instagram.com/v21.0/${containerId}`)
    url.searchParams.set('fields', 'status_code')
    url.searchParams.set('access_token', accessToken)
    const res = await fetch(url.toString())
    const json = await res.json()
    if (json.status_code === 'FINISHED') return
    if (json.status_code === 'ERROR') throw new Error('Instagram media container processing failed.')
  }
  throw new Error('Instagram media container timed out.')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { business_id: string; image_url: string; caption: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { business_id, image_url, caption } = body
  if (!business_id || !image_url) {
    return NextResponse.json({ error: 'business_id and image_url are required' }, { status: 400 })
  }

  // Use service role to read the access_token (never send to client)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: conn, error: connError } = await serviceClient
    .from('instagram_connections')
    .select('ig_user_id, access_token')
    .eq('business_id', business_id)
    .maybeSingle()

  if (connError || !conn) {
    return NextResponse.json({ error: 'No Instagram connection found for this business.' }, { status: 404 })
  }

  const { ig_user_id, access_token } = conn

  try {
    // 1. Create media container
    const createUrl = new URL(`https://graph.instagram.com/v21.0/${ig_user_id}/media`)
    createUrl.searchParams.set('access_token', access_token)
    const createRes = await fetch(createUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, caption: caption ?? '' }),
    })
    const createJson = await createRes.json()
    if (createJson.error) {
      return NextResponse.json({ error: mapInstagramError(createJson.error) }, { status: 422 })
    }
    const containerId: string = createJson.id

    // 2. Poll until FINISHED
    await pollContainer(containerId, ig_user_id, access_token)

    // 3. Publish
    const publishUrl = new URL(`https://graph.instagram.com/v21.0/${ig_user_id}/media_publish`)
    publishUrl.searchParams.set('access_token', access_token)
    const publishRes = await fetch(publishUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId }),
    })
    const publishJson = await publishRes.json()
    if (publishJson.error) {
      return NextResponse.json({ error: mapInstagramError(publishJson.error) }, { status: 422 })
    }

    return NextResponse.json({ success: true, post_id: publishJson.id })
  } catch (err) {
    console.error('[publish]', err)
    const msg = err instanceof Error ? err.message : 'Instagram publish failed. Please try again.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
