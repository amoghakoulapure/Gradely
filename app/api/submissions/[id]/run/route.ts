import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServiceRoleClient } from "../../../../../lib/supabase"
import { getQueue } from "../../../../../lib/queue"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const submissionId = params.id
  const svc = getSupabaseServiceRoleClient()
  const { data: submission, error: subErr } = await svc.from("submissions").select("*").eq("id", submissionId).maybeSingle()
  if (subErr) {
    console.error("Supabase fetch submission error", subErr)
    return NextResponse.json({ error: subErr.message }, { status: 500 })
  }
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  const { data: createdRun, error: runErr } = await svc
    .from("runs")
    .insert([{ submission_id: submissionId, status: "PENDING", logs: "", metrics_json: "" }])
    .select()
    .limit(1)
    .maybeSingle()

  if (runErr) {
    console.error("Supabase insert run error", runErr)
    return NextResponse.json({ error: runErr.message }, { status: 500 })
  }

  const q = getQueue()
  await q.add("grade", { submissionId, runId: (createdRun as any).id })

  return NextResponse.json(createdRun)
}
