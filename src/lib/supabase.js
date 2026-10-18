import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const propertyMediaBucket = import.meta.env.VITE_SUPABASE_PROPERTY_MEDIA_BUCKET || 'property-media'
const runningInVitest = Boolean(import.meta.env.VITEST)

if (!runningInVitest && (!supabaseUrl || !supabasePublishableKey)) {
  throw new Error('Supabase configuration is missing. Check the deployment environment.')
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey) && !runningInVitest

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export function getPropertyMediaBucket() {
  return propertyMediaBucket
}
