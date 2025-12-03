import { NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "../../../../lib/supabase"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const svc = getSupabaseServiceRoleClient()
    const { data: sub, error } = await svc.from("submissions").select("*").eq("id", id).maybeSingle()
    if (error) {
      console.error("Supabase fetch submission error", error)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // Normalize fields for frontend compatibility
    const normalized: any = {
      id: sub.id,
      assignmentId: sub.assignment_id ?? sub.assignmentId,
      code: sub.code,
      language: sub.language,
      createdAt: sub.created_at ?? sub.createdAt,
      userEmail: sub.user_email ?? sub.userEmail,
      studentName: sub.student_name ?? sub.studentName,
      // Provide both snake_case and camelCase review fields for compatibility
      reviewSummary: sub.review_summary ?? sub.reviewSummary ?? null,
      reviewIssuesJSON: typeof sub.review_issues === "string" ? sub.review_issues : JSON.stringify(sub.review_issues || []),
      review_issues: sub.review_issues,
      review_summary: sub.review_summary,
    }

    return NextResponse.json(normalized)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
