'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { InstagramConnection } from '@/types'

export function useInstagramConnection(businessId: string) {
  const [connection, setConnection] = useState<InstagramConnection | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConnection = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('instagram_connections')
      .select('id, business_id, user_id, ig_user_id, ig_username, token_expires_at, created_at, updated_at')
      .eq('business_id', businessId)
      .maybeSingle()
    setConnection(data ?? null)
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  return { connection, loading, refetch: fetchConnection }
}
