'use client'

import { useState } from 'react'
import { BusinessTable } from '@/components/businesses/BusinessTable'
import { GlobalCalendar } from '@/components/businesses/GlobalCalendar'
import { useBusinesses } from '@/hooks/useBusinesses'
import { useAllPosts } from '@/hooks/useAllPosts'
import { cn } from '@/lib/utils'

type Tab = 'clients' | 'calendar'

function GlobalCalendarTab() {
  const { businesses, loading: bizLoading } = useBusinesses()
  const { posts, loading: postsLoading, refetch } = useAllPosts()

  if (bizLoading || postsLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 flex justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <GlobalCalendar businesses={businesses} posts={posts} onRefetch={refetch} />
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('clients')

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-border px-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          {(['clients', 'calendar'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-3 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'clients' ? 'Clients' : 'Calendar'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'clients' ? <BusinessTable /> : <GlobalCalendarTab />}
    </div>
  )
}
