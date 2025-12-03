import { NextResponse, type NextRequest } from "next/server"
import { sanitizePayload } from "../../../lib/model-client"
import { db } from "../../../lib/store"
import { getSupabaseServiceRoleClient } from "../../../lib/supabase"
import { hasSupabaseConfig } from "../../../lib/supabase"

const allowedLanguages = ["typescript", "javascript", "python", "java", "c", "html"] as const
type Language = (typeof allowedLanguages)[number]

function isLanguage(value: string): value is Language {
  return allowedLanguages.includes(value as Language)
}

export async function GET() {
  // If Supabase is configured, prefer the persisted assignments so
  // teacher pages show the data that submissions reference.
  if (hasSupabaseConfig) {
    // Try a couple of times in case of transient network issues (timeouts etc.)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const svc = getSupabaseServiceRoleClient()
        const { data, error } = await svc.from("assignments").select("id, title, description, language, created_at").order("created_at", { ascending: false })
        if (!error && Array.isArray(data)) {
          const items = data.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            language: a.language,
            createdAt: a.created_at ? Date.parse(a.created_at) : Date.now(),
          }))
          return NextResponse.json({ items, source: "supabase" })
        }
        console.error(`Supabase fetch assignments error (attempt ${attempt}):`, error)
      } catch (e: any) {
        console.error(`Error fetching assignments from Supabase (attempt ${attempt}):`, e?.message || e)
      }
      // small backoff between attempts
      await new Promise((r) => setTimeout(r, 250 * attempt))
    }
    // If we reach here, Supabase read failed; fall back to local store
    console.warn("Falling back to local assignment store after Supabase read failures")
  }

  const items = db.listAssignments()
  return NextResponse.json({ items, source: "local" })
}

export async function POST(req: NextRequest) {
  try {
    const headerRole = req.headers.get("x-demo-role")?.toUpperCase()
    let role: string | undefined = headerRole

    // If no demo header, validate Authorization token with Supabase and read app profile
    if (!role) {
      const authHeader = req.headers.get("authorization") || ""
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
      if (token) {
        try {
          const svc = getSupabaseServiceRoleClient()
          const { data: userData, error: userErr } = await (svc.auth as any).getUser(token)
          if (!userErr && userData?.user?.id) {
            const supUser = userData.user
            const { data: profile, error: pErr } = await svc
              .from("profiles")
              .select("role")
              .eq("auth_id", supUser.id)
              .maybeSingle()
            if (!pErr && profile?.role) role = String(profile.role).toUpperCase()
          }
        } catch (e) {
          console.error("Supabase token validation failed", e)
        }
      }
    }

    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const raw = await req.json().catch(() => ({}))
    const body = sanitizePayload(raw) || {}
    const title = String(body.title || "").trim()
    const description = body.description ? String(body.description) : undefined
    const languageInput = String(body.language || "").toLowerCase()

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 })
    if (!languageInput || !isLanguage(languageInput)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }

    const created = db.createAssignment({ title, description, language: languageInput as Language })
    // If Supabase is configured, also persist the assignment record so submissions FK will succeed
    if (hasSupabaseConfig) {
      try {
        const svc = getSupabaseServiceRoleClient()
        await svc.from("assignments").insert([{ id: created.id, title: created.title, description: created.description || null, language: created.language, created_at: new Date().toISOString() }])
      } catch (e) {
        console.error("Failed to persist assignment to Supabase:", e)
      }
    }
    return NextResponse.json(created)
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
