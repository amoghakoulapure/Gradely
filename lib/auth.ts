// NextAuth + Prisma removed in favor of Supabase auth + profiles.
// If any code still imports from `lib/auth.ts`, throw a clear error to guide migration.
export function notSupported() {
  throw new Error("NextAuth/Prisma auth removed. Use Supabase auth and call the Supabase service client (lib/supabase.getSupabaseServiceRoleClient).")
}

export default notSupported
