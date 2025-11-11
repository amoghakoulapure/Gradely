// Lightweight model client wrapper to sanitize payloads and centralize model calls.
// Ensures unsupported fields like `previous_response_id` are removed before forwarding.

export function sanitizePayload(original: any) {
  if (!original || typeof original !== "object") return original
  // Create a shallow copy to avoid mutating the caller's object
  const copy: any = Array.isArray(original) ? [...original] : { ...original }

  // Remove legacy chaining fields that some providers no longer accept
  const forbidden = ["previous_response_id", "previousResponseId", "previous_response", "prev_response_id"]
  for (const key of forbidden) {
    if (key in copy) delete copy[key]
  }

  // Recursively sanitize nested `payload` or `input` fields if present
  if (copy.payload && typeof copy.payload === "object") copy.payload = sanitizePayload(copy.payload)
  if (copy.input && typeof copy.input === "object") copy.input = sanitizePayload(copy.input)

  return copy
}

export async function callModel(url: string, payload: any, opts?: { method?: string; headers?: Record<string, string> }) {
  const method = opts?.method ?? "POST"
  const headers = { "Content-Type": "application/json", ...(opts?.headers ?? {}) }

  const sanitized = sanitizePayload(payload)

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(sanitized),
    })

    const text = await res.text().catch(() => "")
    if (!res.ok) {
      // try to attach parsed body if it's JSON
      let body: any = text
      try {
        body = JSON.parse(text)
      } catch {}
      const err: any = new Error(`Model request failed ${res.status}`)
      err.status = res.status
      err.body = body
      throw err
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch (err) {
    // bubble up with consistent shape
    console.error("callModel error:", err)
    throw err
  }
}
