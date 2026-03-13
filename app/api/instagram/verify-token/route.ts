import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { access_token: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { access_token } = body
  if (!access_token) {
    return NextResponse.json({ error: 'access_token is required' }, { status: 400 })
  }

  try {
    const url = new URL('https://graph.instagram.com/v21.0/me')
    url.searchParams.set('fields', 'id,username,account_type')
    url.searchParams.set('access_token', access_token.trim())
    const res = await fetch(url.toString())
    const json = await res.json()

    if (json.error) {
      return NextResponse.json({ valid: false, error: json.error.message ?? 'Invalid token' })
    }

    if (!json.id || !json.username) {
      return NextResponse.json({ valid: false, error: 'Could not retrieve Instagram account info from this token.' })
    }

    if (json.account_type === 'PERSONAL') {
      return NextResponse.json({
        valid: false,
        error: 'Personal Instagram accounts cannot publish via the API. You need a Business or Creator account.',
      })
    }

    return NextResponse.json({
      valid: true,
      ig_user_id: json.id,
      ig_username: json.username,
    })
  } catch (err) {
    console.error('[verify-token]', err)
    return NextResponse.json({ valid: false, error: 'Network error verifying token.' })
  }
}
