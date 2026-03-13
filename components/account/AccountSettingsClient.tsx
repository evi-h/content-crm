'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FormValues {
  newPassword: string
  confirmPassword: string
}

interface AccountSettingsClientProps {
  userEmail: string
}

export function AccountSettingsClient({ userEmail }: AccountSettingsClientProps) {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const newPassword = watch('newPassword')

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: values.newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      reset()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Account Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">{userEmail}</p>

      <div className="border border-border rounded-lg p-6">
        <h2 className="text-base font-medium mb-4">Change Password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Controller
              name="newPassword"
              control={control}
              rules={{
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              }}
              render={({ field }) => (
                <Input id="newPassword" type="password" placeholder="Min. 8 characters" {...field} />
              )}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: (val) => val === newPassword || 'Passwords do not match',
              }}
              render={({ field }) => (
                <Input id="confirmPassword" type="password" placeholder="Re-enter new password" {...field} />
              )}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Saving…' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
