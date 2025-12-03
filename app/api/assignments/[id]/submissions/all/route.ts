import { NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase"

export async function GET(_req: Request, { params }: { params: any }) {
  try {
    const { id: assignmentId } = await params
    const svc = getSupabaseServiceRoleClient()
    const { data, error } = await svc
      .from("submissions")
      .select("id, assignment_id, code, language, created_at, user_email, student_name")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase fetch submissions error", error)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    const items = (data || []).map((s: any) => ({
      id: s.id,
      assignmentId: s.assignment_id,
      code: s.code,
      language: s.language,
      createdAt: s.created_at,
      userEmail: s.user_email,
      studentName: s.student_name,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
