'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Business } from '@/types'

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBusinesses = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load businesses.')
    } else {
      setBusinesses(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  return { businesses, loading, error, refetch: fetchBusinesses }
}
