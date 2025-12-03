import getSupabaseServerClient from "./supabaseServer"

// Server-side helper to fetch a user from `public.users` by id.
// Use this in server components or route handlers when you have a user's id (from a validated JWT or other server-verified source).
export async function getServerUserById(id: string) {
  const svc = getSupabaseServerClient()
  const { data, error } = await svc.from('users').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export default getServerUserById
