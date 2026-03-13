'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArrowLeft, Loader2, Upload, X, Instagram, CheckCircle } from 'lucide-react'
import type { Business, BrandTone } from '@/types'
import { cn } from '@/lib/utils'
import { BUSINESS_COLORS } from '@/lib/constants'
import { useInstagramConnection } from '@/hooks/useInstagramConnection'

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  instagram_handle: z.string().optional(),
  industry: z.string().optional(),
  brand_tone: z.enum(['professional', 'casual', 'playful', 'bold']).optional(),
})

type BusinessFormData = z.infer<typeof businessSchema>

const BRAND_TONES: { value: BrandTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'playful', label: 'Playful' },
  { value: 'bold', label: 'Bold' },
]

interface SettingsClientProps {
  business: Business
}

export function SettingsClient({ business }: SettingsClientProps) {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(business.logo_url)
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [savingVoice, setSavingVoice] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(business.color ?? '')
  const [takenColors, setTakenColors] = useState<string[]>([])

  const { connection, loading: connectionLoading, refetch: refetchConnection } = useInstagramConnection(business.id)
  const [tokenInput, setTokenInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<{ ig_user_id: string; ig_username: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    async function loadTakenColors() {
      const supabase = createClient()
      const { data } = await supabase
        .from('businesses')
        .select('color')
        .neq('id', business.id)
      setTakenColors((data ?? []).map((r: { color: string | null }) => r.color).filter(Boolean) as string[])
    }
    loadTakenColors()
  }, [business.id])

  const {
    control: businessControl,
    handleSubmit: handleBusinessSubmit,
    formState: { errors: businessErrors },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business.name,
      instagram_handle: business.instagram_handle ?? '',
      industry: business.industry ?? '',
      brand_tone: business.brand_tone ?? undefined,
    },
  })

  // Voice form uses controlled textarea via useState (no RHF needed for a single optional textarea)
  const [voiceNotes, setVoiceNotes] = useState(business.brand_voice_notes ?? '')

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function onBusinessSubmit(data: BusinessFormData) {
    setSavingBusiness(true)
    const supabase = createClient()

    try {
      let logo_url = business.logo_url

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

      const { error } = await supabase
        .from('businesses')
        .update({
          name: data.name,
          instagram_handle: data.instagram_handle || null,
          industry: data.industry || null,
          brand_tone: data.brand_tone || null,
          color: selectedColor || null,
          logo_url,
        })
        .eq('id', business.id)

      if (error) throw error
      toast.success('Business details saved!')
    } catch {
      toast.error('Failed to save changes.')
    } finally {
      setSavingBusiness(false)
    }
  }

  async function onVoiceSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingVoice(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ brand_voice_notes: voiceNotes || null })
        .eq('id', business.id)

      if (error) throw error
      toast.success('Brand voice saved!')
    } catch {
      toast.error('Failed to save.')
    } finally {
      setSavingVoice(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('businesses').delete().eq('id', business.id)
      if (error) throw error
      toast.success(`${business.name} deleted.`)
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete business.')
      setDeleting(false)
    }
  }

  async function handleVerify() {
    if (!tokenInput.trim()) return
    setVerifying(true)
    try {
      const res = await fetch('/api/instagram/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenInput.trim() }),
      })
      const json = await res.json()
      if (json.valid) {
        setVerified({ ig_user_id: json.ig_user_id, ig_username: json.ig_username })
      } else {
        toast.error(json.error ?? 'Token verification failed.')
      }
    } catch {
      toast.error('Failed to verify token. Check your connection.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleConnect() {
    if (!verified) return
    setConnecting(true)
    try {
      const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokenInput.trim(),
          ig_user_id: verified.ig_user_id,
          ig_username: verified.ig_username,
          business_id: business.id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Instagram account connected!')
        setTokenInput('')
        setVerified(null)
        await refetchConnection()
      } else {
        toast.error(json.error ?? 'Failed to connect account.')
      }
    } catch {
      toast.error('Failed to connect Instagram account.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('instagram_connections')
        .delete()
        .eq('business_id', business.id)
      if (error) throw error
      toast.success('Instagram account disconnected.')
      await refetchConnection()
    } catch {
      toast.error('Failed to disconnect.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back link */}
      <Link
        href={`/dashboard/${business.id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {business.name}
      </Link>

      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      {/* 1. Business Details */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Business Details</h2>
        <form onSubmit={handleBusinessSubmit(onBusinessSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Business Name <span className="text-destructive">*</span></Label>
            <Controller
              name="name"
              control={businessControl}
              render={({ field }) => (
                <Input
                  id="name"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {businessErrors.name && (
              <p className="text-xs text-destructive">{businessErrors.name.message as string}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instagram_handle">Instagram Handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Controller
                name="instagram_handle"
                control={businessControl}
                render={({ field }) => (
                  <Input
                    id="instagram_handle"
                    className="pl-7"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry / Niche</Label>
            <Controller
              name="industry"
              control={businessControl}
              render={({ field }) => (
                <Input
                  id="industry"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Brand Tone</Label>
            <Controller
              name="brand_tone"
              control={businessControl}
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

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {BUSINESS_COLORS.map((c) => {
                const taken = takenColors.includes(c.id)
                const selected = selectedColor === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={taken ? `${c.label} (taken)` : c.label}
                    disabled={taken}
                    onClick={() => !taken && setSelectedColor(c.id)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform',
                      taken ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:scale-110',
                      selected ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Logo</Label>
            {logoPreview ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-full object-cover border border-border" />
                <Button type="button" variant="ghost" size="sm" onClick={() => { setLogoFile(null); setLogoPreview(null) }}>
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Click to upload</span>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
              </label>
            )}
          </div>

          <Button type="submit" disabled={savingBusiness}>
            {savingBusiness ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </form>
      </section>

      <Separator className="my-8" />

      {/* 2. Brand Voice */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-1">Brand Voice</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These instructions are added to every caption Claude generates for this business.
        </p>
        <form onSubmit={onVoiceSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="brand_voice_notes">Custom AI Instructions</Label>
            <Textarea
              id="brand_voice_notes"
              placeholder="e.g. Always write in first person. Use emojis sparingly. Never use the word 'delve'. Our audience is women aged 25–40."
              rows={4}
              className="resize-none"
              value={voiceNotes}
              onChange={(e) => setVoiceNotes(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingVoice}>
            {savingVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </form>
      </section>

      <Separator className="my-8" />

      {/* 3. Instagram Publishing */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Instagram className="h-5 w-5 text-pink-500" />
          <h2 className="text-lg font-medium">Instagram Publishing</h2>
        </div>

        {connectionLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : connection ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Connected as @{connection.ig_username}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {disconnecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste a long-lived <strong>Instagram Graph API access token</strong> for a Business or Creator account.
              Get one from the{' '}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Facebook Graph API Explorer
              </a>{' '}
              — select your Instagram app, add permissions{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">instagram_basic</code> and{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">instagram_content_publish</code>, then generate a token.
            </p>
            <Input
              placeholder="Paste access token…"
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setVerified(null) }}
            />
            {!verified ? (
              <Button onClick={handleVerify} disabled={verifying || !tokenInput.trim()}>
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify Token
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Found Instagram account: @{verified.ig_username}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Connect
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setVerified(null); setTokenInput('') }}
                  >
                    Try a different token
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator className="my-8" />

      {/* 4. Danger Zone */}
      <section>
        <h2 className="text-lg font-medium text-destructive mb-4">Danger Zone</h2>
        <div className="border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this business</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes {business.name} and all its posts.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Business
            </Button>
          </div>
        </div>
      </section>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {business.name}?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{business.name}</strong> and all its posts.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
