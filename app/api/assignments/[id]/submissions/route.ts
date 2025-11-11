import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "../../../../../lib/db"
import { sanitizePayload } from "../../../../../lib/model-client"
import { callHfModel } from "../../../../../lib/hf"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const assignmentId = params.id
  const items = await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assignmentId = params.id
    const raw = await req.json().catch(() => ({}))
    const body = sanitizePayload(raw) || {}
    const code = String(body.code || "")
    const language = String(body.language || "")
    const userEmail = body.userEmail ? String(body.userEmail) : undefined

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

    const primary = await callHfModel("bigcode/starcoder2-7b", prompt, { max_new_tokens: 800 })
    let text = ""
    if (primary.ok) text = primary.text
    else {
      const fb = await callHfModel("openai-community/gpt2", prompt, { max_new_tokens: 256 })
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

    const created = await prisma.submission.create({
      data: {
        assignmentId,
        language,
        code,
        reviewSummary: summary,
        reviewIssuesJSON: JSON.stringify(issues),
      },
    })

    return NextResponse.json({
      ...created,
      review: { summary, issues },
    })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 })
  }
}
