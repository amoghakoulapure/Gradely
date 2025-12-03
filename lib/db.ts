// Prisma has been removed in favor of Supabase for this project.
// If any code still imports `prisma` from `lib/db.ts`, this will throw a helpful error.
export const prisma = new Proxy({}, {
  get() {
    throw new Error("Prisma removed: this project uses Supabase only. Replace imports of `prisma` with Supabase client calls (see lib/supabase.ts).")
  },
})
