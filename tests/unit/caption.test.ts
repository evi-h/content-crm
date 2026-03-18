import { vi, describe, it, expect } from 'vitest'

// Prevent Anthropic SDK from detecting jsdom as a browser environment
vi.mock('@/lib/claude', () => ({ anthropic: {} }))

import { buildSystemPrompt } from '@/lib/caption-prompts'
import type { BrandTone } from '@/types'

describe('buildSystemPrompt', () => {
  it('includes the business name', () => {
    const prompt = buildSystemPrompt('Acme Corp', null, null, null)
    expect(prompt).toContain('Acme Corp')
  })

  it('includes the industry when provided', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Retail', null, null)
    expect(prompt).toContain('Retail')
  })

  it('omits the industry line when null', () => {
    const prompt = buildSystemPrompt('Acme Corp', null, null, null)
    expect(prompt).not.toContain('industry')
  })

  it.each<[BrandTone, string]>([
    ['professional', 'formal and authoritative'],
    ['casual', 'friendly and conversational'],
    ['playful', 'fun with light humour'],
    ['bold', 'confident and punchy'],
  ])('maps brand tone %s to correct descriptor', (tone, descriptor) => {
    const prompt = buildSystemPrompt('Biz', null, tone, null)
    expect(prompt).toContain(tone)
    expect(prompt).toContain(descriptor)
  })

  it('defaults to casual tone when brandTone is null', () => {
    const prompt = buildSystemPrompt('Biz', null, null, null)
    expect(prompt).toContain('casual')
    expect(prompt).toContain('friendly and conversational')
  })

  it('includes brandVoiceNotes when provided', () => {
    const prompt = buildSystemPrompt('Biz', null, null, 'Always mention our 30-day guarantee')
    expect(prompt).toContain('Always mention our 30-day guarantee')
  })

  it('omits brandVoiceNotes line when null', () => {
    const prompt = buildSystemPrompt('Biz', null, null, null)
    expect(prompt).not.toContain('Additional brand instructions')
  })

  it('includes Instagram caption rules', () => {
    const prompt = buildSystemPrompt('Biz', null, null, null)
    expect(prompt).toContain('Instagram captions only')
    expect(prompt).toContain('hashtags')
    expect(prompt).toContain('delve')
  })

  it('does not produce consecutive empty lines from nullish fields', () => {
    const prompt = buildSystemPrompt('Biz', null, null, null)
    expect(prompt).not.toMatch(/\n{3,}/)
  })
})
