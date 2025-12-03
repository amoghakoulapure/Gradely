import { NextResponse, type NextRequest } from "next/server"
import { sanitizePayload } from "../../../../../lib/model-client"
import { callGorqModel } from "../../../../../lib/gorq"
import { getSupabaseServiceRoleClient } from "../../../../../lib/supabase"
import { db as localDb } from "../../../../../lib/store"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id: assignmentId } = await params
  const supabase = getSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: assignmentId } = await params
    const raw = await req.json().catch(() => ({}))
    const body = sanitizePayload(raw) || {}
    const code = String(body.code || "")
    const language = String(body.language || "")
    const userEmail = body.userEmail ? String(body.userEmail) : undefined
    const studentName = body.studentName ? String(body.studentName).trim() : undefined

    if (!code.trim()) return NextResponse.json({ error: "Missing code" }, { status: 400 })
    if (!language || !["typescript", "javascript", "python", "java", "c", "html"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }

    // Build review prompt same as /api/review
    const prompt = `
You are a senior code reviewer. Analyze the following ${language} code and return STRICT JSON only.
Rules:
- Provide a concise "summary" (1-3 sentences).
- Provide up to 8 "issues". Each issue must include: line (1-based), message, severity ("info" | "warning" | "error"), and optional suggestion.
- Focus on correctness, clarity, and performance. If line numbers are unclear, estimate reasonably.

Return JSON exactly:
{
  "summary": "...",
  "issues": [
    { "line": 1, "message": "...", "severity": "warning", "suggestion": "..." }
  ]
}

Code:
---
${code}
---
`

    const primary = await callGorqModel("bigcode/starcoder2-7b", prompt, { max_new_tokens: 800 })
    let text = ""
    if (primary.ok) text = primary.text
    else {
      const fb = await callGorqModel("openai-community/gpt2", prompt, { max_new_tokens: 256 })
      text = fb.ok ? fb.text : `Primary failed: ${primary.error}. Fallback failed: ${fb.error}`
    }

    let summary = ""
    let issues: { line: number; message: string; severity: "info" | "warning" | "error"; suggestion?: string }[] = []
    try {
      const start = text.indexOf("{")
      const end = text.lastIndexOf("}")
      const jsonStr = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text
      const parsed = JSON.parse(jsonStr)
      summary = typeof parsed.summary === "string" ? parsed.summary : String(text).slice(0, 300)
      if (Array.isArray(parsed.issues)) {
        issues = parsed.issues.slice(0, 8).map((i: any) => ({
          line: Math.max(1, Number(i.line) || 1),
          message: String(i.message || "Potential issue"),
          severity: (["info", "warning", "error"].includes(i.severity) ? i.severity : "info") as any,
          suggestion: i.suggestion ? String(i.suggestion) : undefined,
        }))
      }
    } catch {
      summary = `AI returned unexpected format. Here is a brief summary: ${text.slice(0, 300)}`
      issues = []
    }
    // Persist into Supabase `submissions` table (server-side service role)
    const supabase = getSupabaseServiceRoleClient()
    // Ensure assignment exists in Supabase (some assignments are stored in-memory only)
    try {
      const { data: existingAssignment, error: asnErr } = await supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle()
      if (asnErr) {
        console.error("Supabase assignments lookup error:", asnErr)
      }
      if (!existingAssignment) {
        // Try to get assignment metadata from local in-memory DB
        const localAssignment = localDb.getAssignment(assignmentId)
        const assignPayload: any = {
          id: assignmentId,
          title: localAssignment?.title || `Assignment ${assignmentId}`,
          description: localAssignment?.description || null,
          language: localAssignment?.language || language,
        }
        const { data: createdAsn, error: createAsnErr } = await supabase.from("assignments").insert([assignPayload]).select().limit(1).single()
        if (createAsnErr) {
          console.error("Failed to create assignment in Supabase:", createAsnErr)
        } else {
          console.log("Created assignment in Supabase for id", assignmentId)
        }
      }
    } catch (e) {
      console.error("Assignment existence check failed:", e)
    }
    const insertPayload: any = {
      assignment_id: assignmentId,
      language,
      code,
      review_summary: summary,
      review_issues: issues,
    }
    if (userEmail) insertPayload.user_email = userEmail
    if (studentName) insertPayload.student_name = studentName
    // Persist submission (assumes `student_name` column exists in the DB)
    const { data: created, error: insertErr } = await supabase
      .from("submissions")
      .insert([insertPayload])
      .select()
      .limit(1)
      .single()

    if (insertErr) {
      console.error("Supabase insert error:", insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ...created,
      review: { summary, issues },
    })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 })
  }
}
