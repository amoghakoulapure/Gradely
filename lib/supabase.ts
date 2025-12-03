import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const hasSupabaseConfig = Boolean(url && serviceRoleKey)

// Wrap global fetch with a timeout to avoid short undici default timeouts
// which can surface as ConnectTimeoutError when networks are flaky.
function makeFetchWithTimeout(timeoutMs = 20000) {
  return async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      // Prefer the global fetch implementation (undici in Node 18+ / Next runtimes)
      const res = await (globalThis.fetch as typeof fetch)(input, { signal: controller.signal, ...(init || {}) })
      return res
    } finally {
      clearTimeout(id)
    }
  }
}

export function getSupabaseServiceRoleClient() {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  }

  const fetchWithTimeout = makeFetchWithTimeout(20000)

  return createClient(url, serviceRoleKey, {
    // pass a fetch wrapper so network calls have a slightly higher timeout
    fetch: fetchWithTimeout as any,
    auth: {
      persistSession: false,
    },
  })
}
