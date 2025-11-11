import { sanitizePayload } from "./model-client"

export async function callHfModel(
  model: string,
  input: string,
  options?: { max_new_tokens?: number },
  apiKeyOverride?: string,
) {
  const key = apiKeyOverride ?? process.env.HUGGINGFACE_API_KEY
  if (!key) {
    return { ok: false, error: "Missing HUGGINGFACE_API_KEY in server environment" }
  }

  // Use the new Router Inference endpoint (old api-inference is deprecated)
  const routerBase = `https://router.huggingface.co/hf-inference`
  const legacyBase = `https://api-inference.huggingface.co`
  const urls = [
    `${routerBase}/text-generation/models/${model}`,
    `${routerBase}/models/${model}`,
    // Legacy Inference API fallback for tokens without Router permissions
    `${legacyBase}/models/${model}`,
  ]
  try {
    let body: any = { inputs: input }
    if (options?.max_new_tokens) body.parameters = { max_new_tokens: options.max_new_tokens }
    // Sanitize body to avoid sending unsupported legacy params
    body = sanitizePayload(body)

    let lastErr = ""
    let firstRouterErr = ""
    let json: any = null
    for (const url of urls) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        const errMsg = `HF inference error: ${res.status} ${txt} (at ${url})`
        // Capture first Router error to avoid being masked by legacy 410
        if (!firstRouterErr && url.includes("router.huggingface.co")) firstRouterErr = errMsg
        // Special guidance for insufficient permissions on Router
        if (res.status === 403 && /does not have sufficient permissions to call Inference Providers/i.test(txt)) {
          lastErr = `${errMsg}. Your HF token likely lacks 'Inference Providers' permission. Edit the token at https://huggingface.co/settings/tokens and enable Inference Providers, or set a different token via the chatbot.`
        } else {
          lastErr = errMsg
        }
        continue
      }

      json = await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))
      break
    }

    if (!json) {
      const err = firstRouterErr || lastErr || `HF inference returned no response. Tried URLs: ${urls.join(", ")}`
      return { ok: false, error: err }
    }

    // Many HF model endpoints return either a string, an array of objects, or text in `generated_text`.
    if (typeof json === "string") return { ok: true, text: json }
    // If it's an array of generations
    if (Array.isArray(json)) {
      // join any text fields
      const texts = json
        .map((item: any) => {
          if (typeof item === "string") return item
          if (item.generated_text) return String(item.generated_text)
          // sometimes the output is { "summary_text": "..." }
          const maybe = Object.values(item).find((v) => typeof v === "string")
          return maybe ? String(maybe) : JSON.stringify(item)
        })
        .join("\n")
      return { ok: true, text: texts }
    }

    if (typeof json === "object" && json !== null) {
      if (typeof (json as any).generated_text === "string") return { ok: true, text: (json as any).generated_text }
      // Fallback: stringify
      return { ok: true, text: JSON.stringify(json) }
    }

    return { ok: false, error: "Unknown HF response format" }
  } catch (err: any) {
    return { ok: false, error: `Failed to call HF model: ${err?.message || String(err)}` }
  }
}
