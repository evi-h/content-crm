import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SettingsClient } from '@/components/businesses/SettingsClient'
import type { Business } from '@/types'

interface Props {
  params: Promise<{ businessId: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { businessId } = await params
  const supabase = await createClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    notFound()
  }

  return <SettingsClient business={business as Business} />
}
