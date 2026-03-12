'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePosts } from '@/hooks/usePosts'
import { CaptionCreator } from '@/components/posts/CaptionCreator'
import { CalendarView } from '@/components/posts/CalendarView'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, PenLine, CalendarDays } from 'lucide-react'
import type { Business } from '@/types'
import { cn } from '@/lib/utils'

interface WorkspaceClientProps {
  business: Business
}

type ActiveView = 'create' | 'calendar'

export function WorkspaceClient({ business }: WorkspaceClientProps) {
  const [activeView, setActiveView] = useState<ActiveView>('create')
  const { posts, refetch } = usePosts(business.id)
  const initials = business.name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left: back + business info */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Clients
            </Link>
            <span className="text-border">·</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                {business.logo_url && (
                  <AvatarImage src={business.logo_url} alt={business.name} />
                )}
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{business.name}</span>
            </div>
          </div>

          {/* Center: view toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveView('create')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeView === 'create'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
              Create
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeView === 'calendar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>

          {/* Right: settings */}
          <Link href={`/dashboard/${business.id}/settings`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {activeView === 'create' ? (
        <CaptionCreator business={business} onPostSaved={refetch} />
      ) : (
        <CalendarView posts={posts} onRefetch={refetch} />
      )}
    </div>
  )
}
