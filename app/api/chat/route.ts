import type { NextRequest } from "next/server"
import { callGroqModel } from "../../../lib/groq"
import { sanitizePayload } from "../../../lib/model-client"
import { getSession, setSession } from "../../../lib/session"
import { closestFreeModel, describeModel } from "../../../lib/groq-free"

function mask(k?: string | null) {
  if (!k) return "not set"
  const s = String(k)
  if (s.length <= 8) return "••••"
  return `${s.slice(0, 4)}••••${s.slice(-4)}`
}

// Session helpers are centralized in lib/session so all routes share hfKey

function parseIntent(
  message: string,
):
  | { kind: "getKey"; model: "groq" }
  | { kind: "setKey"; model: "groq"; key: string }
  | { kind: "runFolder" }
  | { kind: "query"; text: string } {
  const m = message.trim()

  // Get key
  if (/get\s+the\s+current\s+api\s+key.*groq/i.test(m) || /^get key .*groq/i.test(m)) {
    return { kind: "getKey", model: "groq" }
  }

  // Set key
  const setKey =
    m.match(/update\s+the\s+groq\s+api\s+key\s+to\s+(.+)/i) ||
    m.match(/set\s+key\s+groq\s*:\s*(.+)/i)
  if (setKey && setKey[1]) {
    const key = setKey[1].trim().replace(/^["']|["']$/g, "")
    return { kind: "setKey", model: "groq", key }
  }

  // Run folder (UI handled client-side, but we acknowledge)
  if (/^run\b.*\bfolder\b/i.test(m) || /run all .* files in the folder/i.test(m)) {
    return { kind: "runFolder" }
  }

  // Default: forward as query
  return { kind: "query", text: m }
}

// We'll call HF models server-side. Use per-session token if set, else global env HUGGINGFACE_API_KEY.

export async function POST(req: NextRequest) {
  const { id, cfg } = await getSession()
  const rawBody = await req.json().catch(() => ({}))
  const body = sanitizePayload(rawBody) || {}
  const message: string = (body?.message || "").toString()
  if (!message) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 })
  }

  const intent = parseIntent(message)

  // Handle intents
  if (intent.kind === "getKey") {
    const masked = cfg.hfKey ? `${mask(cfg.hfKey)}` : "not set"
    return Response.json({
      reply: `The current API key for Groq is ${masked}. Would you like to update it?`,
    })
  }

  if (intent.kind === "setKey") {
    if (!intent.key || intent.key.length < 8) {
      return Response.json({ reply: "That key looks invalid. Please provide a valid Groq API key." })
    }
    cfg.hfKey = intent.key
    setSession(id, cfg)
    return Response.json({ reply: "API key updated successfully and is now active for Groq." })
  }

  if (intent.kind === "runFolder") {
    return Response.json({
      reply:
        "Running all executable files requires selecting a folder in the client. Click the [Send] message, and I will prompt you with a folder selector to proceed.",
    })
  }

  // Query via Groq models
  const keyToUse = cfg.hfKey ?? process.env.GROQ_API_KEY
  const models = [
    process.env.CHAT_PRIMARY_MODEL || "llama-3.1-8b-instant",
    process.env.CHAT_SECONDARY_MODEL || "mixtral-8x7b-32768",
    process.env.CHAT_FALLBACK_MODEL || "llama-3.1-8b-instant",
  ]
  let replyText = ""
  let lastErr = ""
  let notice = ""
  for (const m of models) {
    const mapped = closestFreeModel(m)
    if (mapped.switched && !notice) {
      notice = `[Using free model] ${describeModel(mapped.info)}. ${mapped.reason || ""}`.trim()
    }
    const res = await callGroqModel(mapped.selected, intent.text, { maxTokens: 512 }, keyToUse)
    if (res.ok) {
      replyText = String(res.text || "")
      lastErr = ""
      break
    } else {
      lastErr = res.error || `Failed calling ${mapped.selected}`
    }
  }
  if (replyText) {
    const combined = notice ? `${notice}\n\n${replyText}` : replyText
    return Response.json({ reply: combined })
  }

  return new Response(JSON.stringify({ error: `All chat models failed: ${lastErr}` }), {
    status: 502,
  })
}

