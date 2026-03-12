'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Post } from '@/types'

export function usePosts(businessId: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('business_id', businessId)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (error) {
      setError('Failed to load posts.')
    } else {
      setPosts(data ?? [])
    }
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    if (businessId) fetchPosts()
  }, [businessId, fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}
