'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Upload, X, Calendar } from 'lucide-react'
import type { Business } from '@/types'
import { addDays, format, setHours, setMinutes } from 'date-fns'
import { cn } from '@/lib/utils'

interface CaptionCreatorProps {
  business: Business
  onPostSaved: () => void
}

export function CaptionCreator({ business, onPostSaved }: CaptionCreatorProps) {
  const [brief, setBrief] = useState('')
  const [caption, setCaption] = useState('')
  const [generating, setGenerating] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Default: tomorrow at 9:00 AM
  const defaultDate = format(addDays(new Date(), 1), "yyyy-MM-dd")
  const [scheduledDate, setScheduledDate] = useState(defaultDate)
  const [scheduledTime, setScheduledTime] = useState('09:00')

  const abortRef = useRef<AbortController | null>(null)

  const charCount = caption.length
  const charWarning = charCount > 2200

  async function generateCaption() {
    if (!brief.trim()) {
      toast.error('Please enter a brief first.')
      return
    }

    setGenerating(true)
    setCaption('')

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: brief.trim(),
          businessName: business.name,
          industry: business.industry,
          brandTone: business.brand_tone,
          brandVoiceNotes: business.brand_voice_notes,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        throw new Error(`${response.status}: ${errBody || 'Failed to generate caption'}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let received = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) {
          received = true
          setCaption(prev => prev + chunk)
        }
      }
      if (!received) throw new Error('Empty response — check server logs')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Caption generation failed: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function savePost(status: 'scheduled' | 'draft') {
    if (status === 'scheduled' && !caption.trim()) {
      toast.error('Please generate or write a caption first.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let image_url: string | null = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${business.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, imageFile, { upsert: true, contentType: imageFile.type })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      let scheduled_at: string | null = null
      if (status === 'scheduled' && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const dt = setMinutes(setHours(new Date(scheduledDate), hours), minutes)
        scheduled_at = dt.toISOString()
      }

      const { error: insertError } = await supabase.from('posts').insert({
        business_id: business.id,
        caption: caption || null,
        image_url,
        platform: 'instagram',
        scheduled_at,
        status,
        brief: brief || null,
      })

      if (insertError) throw insertError

      toast.success(status === 'scheduled' ? 'Post scheduled!' : 'Saved as draft!')

      // Reset form
      setBrief('')
      setCaption('')
      setImageFile(null)
      setImagePreview(null)
      setScheduledDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
      setScheduledTime('09:00')

      onPostSaved()
    } catch {
      toast.error('Failed to save post. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

      {/* Step 1: Brief */}
      <div className="space-y-2">
        <Label htmlFor="brief" className="text-base font-medium">
          What&apos;s this post about?
        </Label>
        <Textarea
          id="brief"
          placeholder="e.g. We're launching a summer sale — 30% off everything this weekend only"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Step 2: Generate */}
      <Button
        onClick={generateCaption}
        disabled={generating || !brief.trim()}
        className="w-full"
        size="lg"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating
            <span className="inline-flex ml-1">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Caption
          </>
        )}
      </Button>

      {/* Step 3: Edit Caption */}
      {(caption || generating) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption" className="text-base font-medium">Your Caption</Label>
            <span className={cn(
              'text-xs',
              charWarning ? 'text-destructive' : charCount > 150 ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {charCount} / 2,200
              {charCount > 150 && charCount <= 2200 && ' · over 150 recommended'}
              {charWarning && ' · exceeds Instagram limit!'}
            </span>
          </div>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            className="resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            💡 Instagram tip: First line is most important — it shows before &quot;more&quot;
          </p>
        </div>
      )}

      {/* Step 4: Image */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Add an Image (optional)</Label>
        {imagePreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Post image preview"
              className="w-full max-h-64 object-cover rounded-lg border border-border"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-sm text-muted-foreground">Drag & drop or click to upload</span>
            <span className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP — max 10MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      {/* Step 5: Schedule */}
      <div className="space-y-2">
        <Label className="text-base font-medium">When should this go out?</Label>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-32">
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 h-10 rounded-md">
            <Calendar className="h-4 w-4" />
            <span>Instagram</span>
          </div>
        </div>
      </div>

      {/* Step 6: Save */}
      <div className="flex gap-3">
        <Button
          onClick={() => savePost('scheduled')}
          disabled={saving || !caption.trim()}
          className="flex-1"
          size="lg"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save to Calendar
        </Button>
        <Button
          onClick={() => savePost('draft')}
          disabled={saving}
          variant="outline"
          size="lg"
        >
          Save as Draft
        </Button>
      </div>
    </div>
  )
}
