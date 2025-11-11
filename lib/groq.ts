import { sanitizePayload } from "./model-client"

export async function callGroqModel(
  model: string,
  input: string,
  options?: { maxTokens?: number },
  apiKeyOverride?: string,
) {
  const key = apiKeyOverride ?? process.env.GROQ_API_KEY
  if (!key) {
    return { ok: false, error: "Missing GROQ_API_KEY in server environment" }
  }

  const url = "https://api.groq.com/openai/v1/chat/completions"
  try {
    let body: any = {
      model,
      messages: [
        { role: "system", content: "You are a helpful coding assistant." },
        { role: "user", content: input },
      ],
      temperature: 0.2,
    }
    if (options?.maxTokens) body.max_tokens = options.maxTokens
    body = sanitizePayload(body)

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const text = await res.text().catch(() => "")
    if (!res.ok) {
      return { ok: false, error: `Groq error ${res.status}: ${text}` }
    }

    try {
      const json = JSON.parse(text)
      const content = json?.choices?.[0]?.message?.content
      if (typeof content === "string" && content.trim()) {
        return { ok: true, text: content }
      }
      return { ok: true, text: text }
    } catch {
      return { ok: true, text }
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to call Groq: ${err?.message || String(err)}` }
  }
}
