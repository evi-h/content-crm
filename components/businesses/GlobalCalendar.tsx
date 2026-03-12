'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Loader2, Trash2, Edit2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  setHours,
  setMinutes,
  addDays,
} from 'date-fns'
import type { Post, Business } from '@/types'
import { cn } from '@/lib/utils'
import { BUSINESS_COLORS, type BusinessColor } from '@/lib/constants'

interface GlobalCalendarProps {
  businesses: Business[]
  posts: Post[]
  onRefetch: () => void
}

const statusBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  scheduled: 'default',
  published: 'secondary',
  draft: 'outline',
}

interface PostModalProps {
  post: Post | null
  businessName?: string
  onClose: () => void
  onDelete: () => void
  onUpdate: (post: Post) => void
}

function PostModal({ post, businessName, onClose, onDelete, onUpdate }: PostModalProps) {
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(post?.caption ?? '')
  const [scheduledDate, setScheduledDate] = useState(
    post?.scheduled_at ? format(new Date(post.scheduled_at), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd')
  )
  const [scheduledTime, setScheduledTime] = useState(
    post?.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '09:00'
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!post) return null

  async function handleSave() {
    if (!post) return
    setSaving(true)
    const supabase = createClient()

    try {
      let scheduled_at: string | null = null
      if (scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const dt = setMinutes(setHours(new Date(scheduledDate), hours), minutes)
        scheduled_at = dt.toISOString()
      }

      const { error } = await supabase
        .from('posts')
        .update({ caption, scheduled_at })
        .eq('id', post.id)

      if (error) throw error

      toast.success('Post updated!')
      onUpdate({ ...post, caption, scheduled_at })
      setEditing(false)
    } catch {
      toast.error('Failed to update post.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post) return
    setDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      toast.success('Post deleted.')
      onDelete()
      onClose()
    } catch {
      toast.error('Failed to delete post.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {businessName ? (
              <span>{businessName} — Post</span>
            ) : (
              <span>Post Details</span>
            )}
            <Badge variant={statusBadgeVariants[post.status] ?? 'outline'} className="ml-1">
              {post.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {post.image_url && !editing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full max-h-48 object-cover rounded-lg"
            />
          )}

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Caption</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-32 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Caption</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption || '(no caption)'}</p>
              </div>
              {post.scheduled_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Scheduled</p>
                  <p className="text-sm">{format(new Date(post.scheduled_at), 'MMM d, yyyy · h:mm a')}</p>
                </div>
              )}
            </div>
          )}

          {confirmDelete ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm text-destructive font-medium">Delete this post? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete} className="flex-1">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          ) : editing ? (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="flex-1">
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={handleSave} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="ml-auto">
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GlobalCalendar({ businesses, posts, onRefetch }: GlobalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  // Build colorMap: businessId → BusinessColor
  const colorMap: Record<string, BusinessColor> = {}
  for (const biz of businesses) {
    if (biz.color) {
      const colorDef = BUSINESS_COLORS.find(c => c.id === biz.color)
      if (colorDef) colorMap[biz.id] = colorDef
    }
  }

  // Build businessMap: businessId → Business
  const businessMap: Record<string, Business> = {}
  for (const biz of businesses) {
    businessMap[biz.id] = biz
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const scheduledPosts = posts.filter(p => p.status !== 'draft' && p.scheduled_at)

  function getPostsForDay(day: Date): Post[] {
    return scheduledPosts.filter(p =>
      p.scheduled_at && isSameDay(new Date(p.scheduled_at), day)
    )
  }

  // Businesses that have a color (for the legend)
  const legendBusinesses = businesses.filter(b => b.color && colorMap[b.id])

  // 10-business limit reached banner
  if (businesses.length >= 10) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800 text-sm">
          You&apos;ve reached the 10-business limit.
        </div>
      </div>
    )
  }

  const selectedBusiness = selectedPost ? businessMap[selectedPost.business_id] : undefined

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Legend */}
      {legendBusinesses.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {legendBusinesses.map(biz => {
            const color = colorMap[biz.id]
            return (
              <div key={biz.id} className="flex items-center gap-1.5 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-muted-foreground">{biz.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
        {days.map((day, i) => {
          const dayPosts = getPostsForDay(day)
          const visible = dayPosts.slice(0, 2)
          const extra = dayPosts.length - 2

          return (
            <div
              key={i}
              className={cn(
                'min-h-24 border-r border-b border-border p-1.5 bg-background',
                !isSameMonth(day, currentMonth) && 'bg-muted/30'
              )}
            >
              <span className={cn(
                'text-xs font-medium block mb-1',
                !isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : 'text-muted-foreground',
                isToday(day) && 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center'
              )}>
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {visible.map(post => {
                  const color = colorMap[post.business_id]
                  const bizName = businessMap[post.business_id]?.name ?? ''
                  const chipStyle = color
                    ? {
                        backgroundColor: color.light,
                        color: color.hex,
                        borderColor: color.hex + '33',
                      }
                    : undefined

                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded border truncate block transition-opacity hover:opacity-80"
                      style={chipStyle}
                    >
                      {bizName && <span className="font-medium mr-1">{bizName.slice(0, 8)}{bizName.length > 8 ? '…' : ''}</span>}
                      {(post.caption ?? '').slice(0, 25) || '(no caption)'}
                    </button>
                  )
                })}
                {extra > 0 && (
                  <p className="text-xs text-muted-foreground pl-1">+{extra} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {scheduledPosts.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No posts scheduled yet across any client.
        </div>
      )}

      {/* Post detail modal */}
      <PostModal
        post={selectedPost}
        businessName={selectedBusiness?.name}
        onClose={() => setSelectedPost(null)}
        onDelete={() => { onRefetch(); setSelectedPost(null) }}
        onUpdate={(updated) => { onRefetch(); setSelectedPost(updated) }}
      />
    </div>
  )
}
