import { getSupabaseServiceRoleClient } from "./supabase"

// Server-side Supabase client (service role) - use only on trusted server environments
export function getSupabaseServerClient() {
  return getSupabaseServiceRoleClient()
}

export default getSupabaseServerClient
