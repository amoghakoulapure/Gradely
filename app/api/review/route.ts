import { type NextRequest, NextResponse } from "next/server"
import { callGroqModel } from "../../../lib/groq"
import { sanitizePayload } from "../../../lib/model-client"
import { getSession } from "../../../lib/session"
import { closestFreeModel, describeModel } from "../../../lib/groq-free"

type ReviewIssue = {
  line: number
  message: string
  severity: "info" | "warning" | "error"
  suggestion?: string
}

type ReviewResult = {
  summary: string
  issues: ReviewIssue[]
}

export async function POST(req: NextRequest) {
  try {
  const raw = await req.json().catch(() => ({}))
  const { code, language } = sanitizePayload(raw) || {}
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json<ReviewResult>({
        summary: "No code provided.",
        issues: [],
      })
    }

    // Prompt the model to return a compact JSON payload with guardrails against generic or incorrect issues
    const lang = String(language || "").toLowerCase()
    const pythonHints = lang === "python" ? `
Additional Python-specific guidance:
- Python integers are arbitrary-precision; do not warn about integer overflow.
- Do not mention division-by-zero unless division is actually present in the code.
- Prefer precise, code-referential issues with correct line numbers.
` : ""

    const prompt = `
You are a precise senior code reviewer. Analyze the following ${language} code and return STRICT JSON only.
Rules:
- Provide a concise "summary" (1-2 sentences) focused on actual issues observed.
- Provide up to 5 high-signal "issues". Each issue must include: line (1-based), message, severity ("info" | "warning" | "error"), and optional suggestion.
- Only report issues that are directly evidenced by the code. Avoid boilerplate or hypothetical concerns.
- If line numbers are unclear, estimate reasonably and conservatively.
${pythonHints}

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

    // Model selection with fallbacks and env overrides
    const { cfg } = await getSession()
    const key = cfg.hfKey ?? process.env.GROQ_API_KEY
    const primaryModel = process.env.REVIEW_PRIMARY_MODEL || "llama-3.1-8b-instant"
    const secondaryModel = process.env.REVIEW_SECONDARY_MODEL || "mixtral-8x7b-32768"
    const tertiaryModel = process.env.REVIEW_TERTIARY_MODEL || "llama-3.1-8b-instant"
    const quaternaryModel = process.env.REVIEW_QUATERNARY_MODEL || "llama-3.1-8b-instant"
    const fallbackModel = process.env.REVIEW_FALLBACK_MODEL || "llama-3.1-8b-instant"

    const tryModels = [primaryModel, secondaryModel, tertiaryModel, quaternaryModel, fallbackModel]
    let text = ""
    let lastErr = ""
    let notice = ""
    for (const m of tryModels) {
      const mapped = closestFreeModel(m)
      if (mapped.switched && !notice) {
        notice = `[Using free model] ${describeModel(mapped.info)}. ${mapped.reason || ""}`.trim()
      }
      const res = await callGroqModel(mapped.selected, prompt, { maxTokens: 800 }, key)
      if (res.ok) {
        text = String(res.text || "")
        lastErr = ""
        break
      } else {
        lastErr = `${mapped.selected}: ${res.error || "Failed"}`
      }
    }
    if (!text) {
      return NextResponse.json<ReviewResult>({ summary: `All models failed: ${lastErr}`, issues: [] })
    }

    let parsed: ReviewResult | null = null
    try {
      // Attempt to locate the outermost JSON block
      const start = text.indexOf("{")
      const end = text.lastIndexOf("}")
      const jsonStr = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text
      parsed = JSON.parse(jsonStr)
    } catch {
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else parsed = null
      } catch {
        parsed = null
      }
    }

    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.issues)) {
      // Fallback: basic summary, no inline issues
      return NextResponse.json<ReviewResult>({
        summary: "AI returned an unexpected format. Here is a brief summary:\n" + text.slice(0, 500),
        issues: [],
      })
    }

    // Sanitize and then post-filter issues to reduce hallucinations
    let issues = (parsed.issues as any[]).slice(0, 12).map((i) => ({
      line: Math.max(1, Number(i.line) || 1),
      message: String(i.message || "Potential issue"),
      severity: (["info", "warning", "error"].includes(i.severity) ? i.severity : "info") as
        | "info"
        | "warning"
        | "error",
      suggestion: i.suggestion ? String(i.suggestion) : undefined,
    }))

    const codeStr = String(code || "")
    const hasDivision = /\//.test(codeStr)
    // Extract primary function names for simple style checks
    const funcMatch = lang === "python" ? codeStr.match(/\bdef\s+([A-Za-z_][\w]*)\s*\(/) : null
    const funcName = funcMatch?.[1]
    const isSnake = !!funcName && /^[a-z_][a-z0-9_]*$/.test(funcName)

    // Apply heuristics
    issues = issues.filter((it) => {
      const m = it.message.toLowerCase()
      // Drop division-by-zero if no division operator in code
      if (!hasDivision && m.includes("division by zero")) return false
      // Python: drop integer overflow concerns
      if (lang === "python" && /overflow/.test(m)) return false
      // Drop spurious naming complaints if function already snake_case
      if (lang === "python" && isSnake && /naming convention|rename the function/.test(m)) return false
      // Drop generic "wrap in try/except" if there is no IO/externals; allow if severity >= warning
      if (/try-?except|exceptions may occur/.test(m) && it.severity === "info") return false
      return true
    })

    // Deduplicate by (line,message)
    const seen = new Set<string>()
    issues = issues.filter((it) => {
      const key = `${it.line}|${it.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Prioritize: error > warning > info, then by line asc; cap to 5
    const rank = { error: 0, warning: 1, info: 2 } as const
    issues = issues
      .sort((a, b) => (rank[a.severity] - rank[b.severity]) || (a.line - b.line))
      .slice(0, 5)

    const result: ReviewResult = {
      summary: notice ? `${notice}\n\n${parsed.summary}` : parsed.summary,
      issues,
    }
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json<ReviewResult>({
      summary: "Unexpected error while analyzing code. Please try again.",
      issues: [],
    })
  }
}
