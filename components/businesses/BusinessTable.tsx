'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinesses } from '@/hooks/useBusinesses'
import { createClient } from '@/lib/supabase'
import { AddBusinessModal } from './AddBusinessModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Business } from '@/types'

// Skeleton loader row
function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

interface BusinessRowProps {
  business: Business & {
    lastPosted?: string | null
    nextScheduled?: string | null
    isActive?: boolean
  }
}

function BusinessRow({ business }: BusinessRowProps) {
  const router = useRouter()
  const initials = business.name.slice(0, 2).toUpperCase()

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => router.push(`/dashboard/${business.id}`)}
    >
      <TableCell>
        <Avatar className="h-9 w-9">
          {business.logo_url && <AvatarImage src={business.logo_url} alt={business.name} />}
          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell>
        <span className="font-medium text-foreground">{business.name}</span>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-sm">
          {business.instagram_handle ? `@${business.instagram_handle}` : '—'}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {business.lastPosted
            ? format(new Date(business.lastPosted), 'MMM d, yyyy')
            : 'Never'}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {business.nextScheduled
            ? format(new Date(business.nextScheduled), 'MMM d, yyyy')
            : 'None'}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={business.isActive ? 'default' : 'secondary'}>
          {business.isActive ? 'Active' : 'Idle'}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

interface BusinessWithMeta extends Business {
  lastPosted?: string | null
  nextScheduled?: string | null
  isActive?: boolean
}

export function BusinessTable() {
  const { businesses, loading, refetch } = useBusinesses()
  const [modalOpen, setModalOpen] = useState(false)
  const [businessesWithMeta, setBusinessesWithMeta] = useState<BusinessWithMeta[]>([])
  const [metaLoaded, setMetaLoaded] = useState(false)

  // Load post metadata for each business
  async function loadMeta(biz: Business[]) {
    if (biz.length === 0) {
      setBusinessesWithMeta([])
      setMetaLoaded(true)
      return
    }
    const supabase = createClient()
    const ids = biz.map(b => b.id)

    const { data: posts } = await supabase
      .from('posts')
      .select('business_id, status, scheduled_at')
      .in('business_id', ids)

    const meta = biz.map(b => {
      const bizPosts = posts?.filter(p => p.business_id === b.id) ?? []
      const published = bizPosts.filter(p => p.status === 'published' && p.scheduled_at)
      const scheduled = bizPosts.filter(p => p.status === 'scheduled' && p.scheduled_at)

      const lastPosted = published.sort((a, b) =>
        new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime()
      )[0]?.scheduled_at ?? null

      const nextScheduled = scheduled
        .filter(p => new Date(p.scheduled_at!) > new Date())
        .sort((a, b) =>
          new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
        )[0]?.scheduled_at ?? null

      return {
        ...b,
        lastPosted,
        nextScheduled,
        isActive: !!nextScheduled,
      }
    })

    setBusinessesWithMeta(meta)
    setMetaLoaded(true)
  }

  // When businesses load, fetch meta
  const prevLength = businessesWithMeta.length
  if (!loading && businesses.length !== prevLength || (!loading && !metaLoaded)) {
    loadMeta(businesses)
  }

  const isEmpty = !loading && metaLoaded && businessesWithMeta.length === 0

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Your Clients</h1>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Business
          </Button>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">No clients yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Add your first one to get started.</p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Business
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Last Posted</TableHead>
                  <TableHead>Next Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || !metaLoaded ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : (
                  businessesWithMeta.map(b => (
                    <BusinessRow key={b.id} business={b} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddBusinessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setMetaLoaded(false)
          refetch()
        }}
      />
    </>
  )
}
