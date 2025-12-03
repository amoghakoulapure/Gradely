import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  process.exitCode = 1
}

const supabase = createClient(url, key)

async function main() {
  const started = Date.now()
  try {
    const { data, error, count } = await supabase.from("assignments").select("id", { count: "exact" })
    if (error) throw error
    const assignmentCount = count ?? (data ? data.length : 0)
    console.log(JSON.stringify({ ok: true, assignmentCount, latencyMs: Date.now() - started, timestamp: new Date().toISOString() }, null, 2))
  } catch (error) {
    console.error("Database health check failed:", error)
    const message = error instanceof Error ? error.message : String(error)
    console.log(JSON.stringify({ ok: false, error: message, timestamp: new Date().toISOString() }, null, 2))
    process.exitCode = 1
  }
}

main()
