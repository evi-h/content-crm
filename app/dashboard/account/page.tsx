import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AccountSettingsClient } from '@/components/account/AccountSettingsClient'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <AccountSettingsClient userEmail={user.email ?? ''} />
}
