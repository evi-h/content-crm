import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { anthropic } from '@/lib/claude'
import type { BrandTone } from '@/types'
import { buildSystemPrompt } from '@/lib/caption-prompts'

interface GenerateCaptionRequest {
  brief: string
  businessName: string
  industry?: string | null
  brandTone?: BrandTone | null
  brandVoiceNotes?: string | null
}

export async function POST(request: NextRequest) {
  // Verify auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: GenerateCaptionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.brief || !body.businessName) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(
    body.businessName,
    body.industry,
    body.brandTone,
    body.brandVoiceNotes
  )

  try {
    // Await the stream so Anthropic auth/network errors are caught here
    // before we return a Response (prevents ERR_EMPTY_RESPONSE on failure)
    const anthropicStream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: body.brief }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('[generate-caption] stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[generate-caption] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate caption' },
      { status: 500 }
    )
  }
}
