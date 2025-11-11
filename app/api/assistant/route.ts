import type { NextRequest } from "next/server"
import { sanitizePayload } from "../../../lib/model-client"
import { callGroqModel } from "../../../lib/groq"
import { getSession } from "../../../lib/session"
import { closestFreeModel, describeModel } from "../../../lib/groq-free"

export async function POST(req: NextRequest) {
  try {
  const rawBody = await req.json().catch(() => ({}))
  const body = sanitizePayload(rawBody) || {}
  const { prompt, code, language } = body || {}

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 })
    }

    // Build a system-style context for code-aware assistance
    const system = [
      "You are an in-editor AI coding assistant.",
      "You must return STRICT JSON with a concise summary and concrete code suggestions.",
      "When suggesting changes, provide clear diffs or exact replacement/insert blocks and include approximate line hints.",
      "Prefer minimal, safe edits. Avoid overwriting entire files unless asked.",
    ].join(" ")

    // Model selection with fallbacks and env overrides
    const { cfg } = await getSession()
    const key = cfg.hfKey ?? process.env.GROQ_API_KEY
    const lang = String(language || "").toLowerCase()
    const promptForModel = [
      system,
      `Task: ${prompt}`,
      code ? `\nContext (${lang || "code"}):\n${code}` : "",
      `\nReturn JSON exactly in this shape:\n{\n  "summary": "<1-2 sentence answer>",\n  "suggestions": [\n    {\n      "title": "<short title>",\n      "rationale": "<why>",\n      "apply": { "type": "replace" | "insert" | "patch", "range": { "startLine": <number>, "endLine": <number> }, "code": "<replacement or insertion>" }\n    }\n  ]\n}`,
    ].filter(Boolean).join("\n\n")
    const primaryModel = process.env.ASSISTANT_PRIMARY_MODEL || "llama-3.1-8b-instant"
    const secondaryModel = process.env.ASSISTANT_SECONDARY_MODEL || "mixtral-8x7b-32768"
    const tertiaryModel = process.env.ASSISTANT_TERTIARY_MODEL || "llama-3.1-8b-instant"
    const fallbackModel = process.env.ASSISTANT_FALLBACK_MODEL || "llama-3.1-8b-instant"

    const tryModels = [primaryModel, secondaryModel, tertiaryModel, fallbackModel]
    let text = ""
    let lastErr = ""
    let notice = ""
    for (const m of tryModels) {
      const mapped = closestFreeModel(m)
      if (mapped.switched && !notice) {
        notice = `[Using free model] ${describeModel(mapped.info)}. ${mapped.reason || ""}`.trim()
      }
      const res = await callGroqModel(mapped.selected, promptForModel, { maxTokens: 1024 }, key)
      if (res.ok) {
        text = String(res.text || "")
        lastErr = ""
        break
      } else {
        lastErr = res.error || `Failed calling ${mapped.selected}`
      }
    }
    if (!text) {
      return new Response(JSON.stringify({ error: "Upstream error", info: lastErr }), { status: 502 })
    }

    // Helper: attempt to repair malformed JSON (triple quotes, fenced code) and parse
    function tryRepairAndParse(raw: string): any | null {
      // Quick direct parse
      try { return JSON.parse(raw) } catch {}
      let s = raw
      // Replace Python-style triple quotes with JSON strings
      s = s.replace(/"""\s*([\s\S]*?)\s*"""/g, (_m, p1) => {
        return JSON.stringify(String(p1))
      })
      // Replace fenced code blocks with JSON strings
      s = s.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_m, p1) => {
        return JSON.stringify(String(p1))
      })
      // Extract first object block if present
      const match = s.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[0]) } catch {}
      }
      return null
    }

    // Try to parse JSON from the model when possible; otherwise extract or degrade gracefully.
    try {
      const parsed = JSON.parse(text)
      const baseSummary = parsed?.summary ?? ""
      const summary = notice ? `${notice}\n\n${baseSummary}` : baseSummary
      const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
      const suggestions = rawSuggestions
        .map((sug: any) => {
          const apply = sug?.apply || {}
          const t = apply?.type
          const type = t === "replace" || t === "insert" || t === "patch" ? t : "replace"
          const range = apply?.range || {}
          const startLine = Number(range?.startLine) || 1
          const endLine = Number(range?.endLine) || startLine
          const code = typeof apply?.code === "string" ? apply.code : String(apply?.code ?? "")
          return {
            title: String(sug?.title || "Suggestion"),
            rationale: sug?.rationale ? String(sug.rationale) : undefined,
            apply: { type, range: { startLine, endLine }, code },
          }
        })
        .filter((s: any) => typeof s.apply?.code === "string" && s.apply.code.trim().length > 0)
      const normalized = { summary, suggestions, raw: parsed }
      return new Response(JSON.stringify(normalized), { status: 200, headers: { "Content-Type": "application/json" } })
    } catch {
      // Attempt to repair and parse
      const repaired = tryRepairAndParse(text)
      if (repaired && typeof repaired === "object") {
        const baseSummary = repaired?.summary ?? ""
        const summary = notice ? `${notice}\n\n${baseSummary}` : baseSummary
        const rawSuggestions = Array.isArray(repaired?.suggestions) ? repaired.suggestions : []
        const suggestions = rawSuggestions
          .map((sug: any) => {
            const apply = sug?.apply || {}
            const t = apply?.type
            const type = t === "replace" || t === "insert" || t === "patch" ? t : "replace"
            const range = apply?.range || {}
            const startLine = Number(range?.startLine) || 1
            const endLine = Number(range?.endLine) || startLine
            const code = typeof apply?.code === "string" ? apply.code : String(apply?.code ?? "")
            return {
              title: String(sug?.title || "Suggestion"),
              rationale: sug?.rationale ? String(sug.rationale) : undefined,
              apply: { type, range: { startLine, endLine }, code },
            }
          })
          .filter((s: any) => typeof s.apply?.code === "string" && s.apply.code.trim().length > 0)
        const normalized = { summary, suggestions, raw: repaired }
        return new Response(JSON.stringify(normalized), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      // Final fallback: return trimmed text as summary
      const baseSummary = String(text || "").slice(0, 600)
      const summary = notice ? `${notice}\n\n${baseSummary}` : baseSummary
      return new Response(JSON.stringify({ summary, suggestions: [], raw: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Assistant route failure", message: err?.message }), { status: 500 })
  }
}
