import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { WorkspaceClient } from '@/components/businesses/WorkspaceClient'
import type { Business } from '@/types'

interface Props {
  params: Promise<{ businessId: string }>
}

export default async function BusinessWorkspacePage({ params }: Props) {
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

  return <WorkspaceClient business={business as Business} />
}
