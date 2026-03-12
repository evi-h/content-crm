'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Post } from '@/types'

export function useAllPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: bizRows, error: bizError } = await supabase
      .from('businesses')
      .select('id')

    if (bizError) {
      setError('Failed to load posts.')
      setLoading(false)
      return
    }

    const ids = (bizRows ?? []).map((b: { id: string }) => b.id)

    if (ids.length === 0) {
      setPosts([])
      setLoading(false)
      return
    }

    const { data, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('business_id', ids)

    if (postsError) {
      setError('Failed to load posts.')
    } else {
      setPosts(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllPosts()
  }, [fetchAllPosts])

  return { posts, loading, error, refetch: fetchAllPosts }
}
