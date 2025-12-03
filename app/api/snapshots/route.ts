import { NextRequest, NextResponse } from "next/server"
import { sanitizePayload } from "@/lib/model-client"
import { getSupabaseServiceRoleClient, hasSupabaseConfig } from "@/lib/supabase"
import { getUUID } from "@/lib/id"
import { listSnapshotsFallback, saveSnapshotFallback } from "@/lib/snapshot-store"

const allowedLanguages = ["typescript", "javascript", "python", "java", "c", "html"] as const

type AllowedLanguage = (typeof allowedLanguages)[number]

function resolveUser(req: NextRequest): string {
  const headerUser = req.headers.get("x-demo-user")?.trim()
  if (headerUser) return headerUser
  return "demo@gradely.test"
}

export async function GET(req: NextRequest) {
  try {
    const user = resolveUser(req)
    if (!hasSupabaseConfig) {
      const items = listSnapshotsFallback(user)
      return NextResponse.json({ items })
    }

    const supabase = getSupabaseServiceRoleClient()
    const { data, error } = await supabase
      .from("snapshots")
      .select("id, language, code, created_at")
      .eq("user", user)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error("Snapshots GET failed", err)
    return NextResponse.json({ error: "Failed to load snapshots" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = resolveUser(req)
    const raw = await req.json().catch(() => ({}))
    const body = sanitizePayload(raw) || {}
    const language = String(body.language || "").toLowerCase()
    const code = String(body.code || "")

    if (!code.trim()) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }
    if (!allowedLanguages.includes(language as AllowedLanguage)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }

    const payload = {
      id: getUUID(),
      language,
      code,
      user,
      created_at: new Date().toISOString(),
    }

    if (!hasSupabaseConfig) {
      const row = saveSnapshotFallback(payload)
      return NextResponse.json(row, { status: 201 })
    }

    const { created_at, ...rest } = payload
    const supabase = getSupabaseServiceRoleClient()
    const { data, error } = await supabase
      .from("snapshots")
      .insert(rest)
      .select("id, language, code, created_at")
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("Snapshots POST failed", err)
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 })
  }
}
