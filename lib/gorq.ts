import { callModel, sanitizePayload } from "./model-client"

export async function callGorqModel(
  model: string,
  input: string,
  options?: { max_new_tokens?: number },
  apiKeyOverride?: string,
) {
  // Accept either the correct `GORQ_API_KEY` or a common typo `GROQ_API_KEY`.
  const key = apiKeyOverride ?? process.env.GORQ_API_KEY ?? process.env.GROQ_API_KEY
  const base = process.env.GORQ_API_URL || "https://api.gorq.ai/v1"
  if (!key) {
    return { ok: false, error: "Missing GORQ_API_KEY in server environment" }
  }

  if (!process.env.GORQ_API_KEY && process.env.GROQ_API_KEY) {
    // Helpful warning when the common typo env var is present instead of the expected one.
    // This logs on the server console during development.
    try {
      // eslint-disable-next-line no-console
      console.warn("Using GROQ_API_KEY environment variable — consider renaming it to GORQ_API_KEY")
    } catch (e) {}
  }

  // Build request payload in a provider-agnostic shape
  const payload: any = {
    model,
    prompt: input,
  }
  if (options?.max_new_tokens) payload.max_tokens = options.max_new_tokens

  try {
    const url = `${base.replace(/\/$/, "")}/generate`
    const res = await callModel(url, payload, { headers: { Authorization: `Bearer ${key}` } })

    // callModel returns parsed JSON or raw string. Normalize to { ok, text }
    if (typeof res === "string") return { ok: true, text: res }
    if (typeof res === "object" && res !== null) {
      // Common shapes: { text: "..." } or { output: [ { text: "..." } ] }
      if (typeof res.text === "string") return { ok: true, text: res.text }
      if (Array.isArray(res.output) && res.output.length > 0) {
        const first = res.output[0]
        if (typeof first === "string") return { ok: true, text: first }
        if (typeof first.text === "string") return { ok: true, text: first.text }
      }
      // Fallback: stringify
      return { ok: true, text: JSON.stringify(res) }
    }

    return { ok: false, error: "Unknown Gorq response format" }
  } catch (err: any) {
    return { ok: false, error: `Failed to call Gorq model: ${err?.message || String(err)}` }
  }
}
