import { NextResponse } from "next/server"
import getSupabaseServerClient from "../../../../../../lib/supabaseServer"
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const assignmentId = params.id

    // Auth: expect Authorization: Bearer <access_token>
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 })

    // Validate token and ensure user is a teacher via Supabase profiles
    const svc = getSupabaseServiceRoleClient()
    let supUser: any = null
    try {
      const { data, error } = await (svc.auth as any).getUser(token)
      if (error) throw error
      supUser = data?.user
    } catch (e) {
      console.error("Supabase token validation failed", e)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!supUser?.email) return NextResponse.json({ error: "Invalid supabase user" }, { status: 401 })

    const { data: appUser, error: profErr } = await svc.from("profiles").select("*").eq("email", supUser.email).maybeSingle()
    if (profErr) {
      console.error("Supabase profiles lookup failed", profErr)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
    if (!appUser || appUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Query users who have submissions for this assignment (paginated)
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
    const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") || "20")))
    const search = (url.searchParams.get("search") || "").trim()

    // Fetch submissions for this assignment and aggregate per-user
    const { data: subs, error: subsErr } = await svc
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false })

    if (subsErr) {
      console.error("Supabase submissions fetch error", subsErr)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    const submissions = subs || []
    // Group submissions by user key (prefer user_email)
    const map = new Map()
    const emails = new Set<string>()
    submissions.forEach((s: any) => {
      // Prefer grouping by email / user id, but fall back to student_name if provided
      const key = s.user_email || s.user_id || s.auth_id || s.student_name || "anonymous"
      if (s.user_email) emails.add(s.user_email)
      if (!map.has(key)) map.set(key, { attempts: 0, latest: null, submissions: [] })
      const entry = map.get(key)
      entry.attempts += 1
      if (!entry.latest) entry.latest = { id: s.id, createdAt: s.created_at, reviewSummary: s.review_summary }
      entry.submissions.push(s)
    })

    // Optionally filter by search (name or email) using profiles
    const emailList = Array.from(emails)
    let profilesByEmail: Record<string, any> = {}
    if (emailList.length > 0) {
      const { data: profiles, error: pErr } = await svc.from("profiles").select("*").in("email", emailList)
      if (!pErr && profiles) {
        profiles.forEach((p: any) => {
          profilesByEmail[p.email] = p
        })
      }
    }

    // Build items array
    const allItems = Array.from(map.entries()).map(([key, v]: any) => {
      const email = v.submissions[0]?.user_email || null
      const profile = email ? profilesByEmail[email] : null
      // If student supplied a name during submission, prefer it. Otherwise use profile name or email.
      const name = v.submissions[0]?.student_name || profile?.name || (email ?? "Unknown")
      const userId = profile?.id || email || key
      const latest = v.latest
      let status = "NOT_SUBMITTED"
      if (v.attempts === 0) status = "NOT_SUBMITTED"
      else if (!latest?.reviewSummary || latest.reviewSummary === "") status = "NEEDS_REVIEW"
      else status = "REVIEWED"
      return {
        userId,
        name,
        email,
        latestSubmission: latest ? { id: latest.id, createdAt: latest.createdAt, reviewSummary: latest.reviewSummary } : null,
        attemptsCount: v.attempts,
        status,
      }
    })

    const total = allItems.length
    // pagination
    const start = (page - 1) * pageSize
    const items = allItems.slice(start, start + pageSize)

    return NextResponse.json({ items, total, page, pageSize })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
