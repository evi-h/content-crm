import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { anthropic } from '@/lib/claude'
import type { BrandTone } from '@/types'

interface GenerateCaptionRequest {
  brief: string
  businessName: string
  industry?: string | null
  brandTone?: BrandTone | null
  brandVoiceNotes?: string | null
}

function buildSystemPrompt(
  businessName: string,
  industry: string | null | undefined,
  brandTone: BrandTone | null | undefined,
  brandVoiceNotes: string | null | undefined
): string {
  const toneDesc: Record<BrandTone, string> = {
    professional: 'formal and authoritative',
    casual: 'friendly and conversational',
    playful: 'fun with light humour',
    bold: 'confident and punchy',
  }

  const lines = [
    `You are a social media content writer for ${businessName}.`,
    industry ? `The business operates in the ${industry} industry.` : '',
    brandTone
      ? `Tone: ${brandTone} (${toneDesc[brandTone]}).`
      : 'Tone: casual (friendly and conversational).',
    brandVoiceNotes ? `Additional brand instructions: ${brandVoiceNotes}` : '',
    '',
    'You write Instagram captions only. Rules:',
    '- Write in the brand\'s voice, not generically',
    '- Lead with the most important message — it shows before "more"',
    '- Keep it under 150 characters when possible, 2200 max',
    '- Add 3–5 relevant hashtags at the end on a new line',
    '- Do not use the word "delve"',
    '- Do not add any preamble or explanation — output the caption only',
  ]

  return lines.filter(Boolean).join('\n')
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
