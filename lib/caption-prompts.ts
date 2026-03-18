import type { BrandTone } from '@/types'

export function buildSystemPrompt(
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
