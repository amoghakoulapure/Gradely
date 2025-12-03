import { NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "../../../lib/supabase"

async function validateTokenGetAuthUser(token: string | null) {
  if (!token) return null
  try {
    const svc = getSupabaseServiceRoleClient()
    // validate token and get user
    const { data, error } = await (svc.auth as any).getUser(token)
    if (error) throw error
    return data?.user ?? null
  } catch (e) {
    console.error("validateTokenGetAuthUser", e)
    return null
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    const authUser = await validateTokenGetAuthUser(token)
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const svc = getSupabaseServiceRoleClient()
    const { data: profile, error } = await svc.from("profiles").select("*").eq("auth_id", authUser.id).maybeSingle()
    if (error) {
      console.error("Supabase profiles select error", error)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    return NextResponse.json({ profile })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    const authUser = await validateTokenGetAuthUser(token)
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name = String(body.name || authUser.user_metadata?.full_name || authUser.email || "").trim()
    const roleInput = String(body.role || "student").toUpperCase()
    const role = roleInput === "TEACHER" ? "TEACHER" : "STUDENT"

    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })

    // Upsert profile linked by auth_id in Supabase
    const svc = getSupabaseServiceRoleClient()
    const payload = { auth_id: authUser.id, email: authUser.email, name, role }
    const { data: up, error } = await svc.from("profiles").upsert([payload], { onConflict: "auth_id" }).select().maybeSingle()
    if (error) {
      console.error("Supabase upsert error", error)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    return NextResponse.json({ profile: up })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
