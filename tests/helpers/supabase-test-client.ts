import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export const hasLocalSupabase = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')

export const serviceClient = hasLocalSupabase
  ? createClient(supabaseUrl, serviceRoleKey)
  : null

export const anonClient = hasLocalSupabase
  ? createClient(supabaseUrl, anonKey)
  : null
