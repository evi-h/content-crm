'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Upload, X } from 'lucide-react'
import type { BrandTone } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Business name is required').max(100, 'Max 100 characters'),
  instagram_handle: z.string().optional(),
  industry: z.string().optional(),
  brand_tone: z.enum(['professional', 'casual', 'playful', 'bold']).optional(),
})

type FormData = z.infer<typeof schema>

const BRAND_TONES: { value: BrandTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'playful', label: 'Playful' },
  { value: 'bold', label: 'Bold' },
]

interface AddBusinessModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddBusinessModal({ open, onClose, onSuccess }: AddBusinessModalProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      instagram_handle: '',
      industry: '',
      brand_tone: undefined,
    },
  })

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleClose() {
    reset()
    setLogoFile(null)
    setLogoPreview(null)
    onClose()
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    const supabase = createClient()

    try {
      let logo_url: string | null = null

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        logo_url = urlData.publicUrl
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase.from('businesses').insert({
        user_id: user.id,
        name: data.name,
        instagram_handle: data.instagram_handle || null,
        industry: data.industry || null,
        brand_tone: data.brand_tone || null,
        logo_url,
      })

      if (insertError) throw insertError

      toast.success('Business added successfully!')
      handleClose()
      onSuccess()
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Business Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  placeholder="e.g. Acme Coffee Co."
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message as string}</p>
            )}
          </div>

          {/* Instagram Handle */}
          <div className="space-y-1.5">
            <Label htmlFor="instagram_handle">Instagram Handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Controller
                name="instagram_handle"
                control={control}
                render={({ field }) => (
                  <Input
                    id="instagram_handle"
                    placeholder="handle"
                    className="pl-7"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry / Niche</Label>
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <Input
                  id="industry"
                  placeholder="e.g. fitness, restaurant, e-commerce"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          {/* Brand Tone */}
          <div className="space-y-1.5">
            <Label>Brand Tone</Label>
            <Controller
              name="brand_tone"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2 flex-wrap">
                  {BRAND_TONES.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => field.onChange(tone.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        field.value === tone.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      )}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <Label>Logo (optional)</Label>
            {logoPreview ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-full object-cover border border-border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                >
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Click to upload</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Add Business'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
