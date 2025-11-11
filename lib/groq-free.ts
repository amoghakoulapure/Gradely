// Registry of Groq models assumed to be available on the free tier and their metadata.
// If a requested model is not free, we switch to a closest free equivalent.

export type GroqModelInfo = {
  id: string
  name: string
  context: number
  capability: string
}

// Known free models (update if Groq changes availability)
const FREE_MODELS: Record<string, GroqModelInfo> = {
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    context: 8192,
    capability: "Fast general reasoning, coding help, summaries.",
  },
  "mixtral-8x7b-32768": {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B (32k)",
    context: 32768,
    capability: "Stronger reasoning and longer context; good for code analysis.",
  },
}

// Map paid/deprecated models to a free equivalent
const EQUIVALENTS: Record<string, string> = {
  // Decommissioned IDs
  "llama3-8b-8192": "llama-3.1-8b-instant",
  // Hypothetical paid IDs -> free fallback
  "llama-3.1-70b-versatile": "mixtral-8x7b-32768",
}

export function isFreeModel(id: string) {
  return !!FREE_MODELS[id]
}

export function closestFreeModel(id?: string): { selected: string; switched: boolean; reason?: string; info: GroqModelInfo } {
  const requested = (id || "").trim()
  const direct = requested && FREE_MODELS[requested]
  if (direct) return { selected: requested, switched: false, info: direct }

  const mapped = requested && EQUIVALENTS[requested]
  if (mapped && FREE_MODELS[mapped]) {
    return {
      selected: mapped,
      switched: true,
      reason: `Requested model '${requested}' is not free or is deprecated. Switched to '${mapped}'.`,
      info: FREE_MODELS[mapped],
    }
  }

  // Default fallback to a known reliable free model
  const fallback = FREE_MODELS["llama-3.1-8b-instant"]
  return {
    selected: fallback.id,
    switched: requested ? true : false,
    reason: requested ? `Requested model '${requested}' is not free. Switched to '${fallback.id}'.` : undefined,
    info: fallback,
  }
}

export function describeModel(info: GroqModelInfo) {
  return `${info.name} (id: ${info.id}, context: ${info.context}), ${info.capability}`
}
