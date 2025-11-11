import { NextResponse } from "next/server"
import { callGroqModel } from "../../../lib/groq"

export async function GET() {
  const models = [
    process.env.CHAT_PRIMARY_MODEL || "llama-3.1-8b-instant",
    process.env.CHAT_SECONDARY_MODEL || "mixtral-8x7b-32768",
    process.env.CHAT_FALLBACK_MODEL || "llama-3.1-8b-instant",
  ]

  const prompt = "Say 'ok' and then your model id."
  const attempts: Array<{ model: string; ok: boolean; text?: string; error?: string }> = []

  for (const m of models) {
    const res = await callGroqModel(m, prompt, { maxTokens: 64 })
    if (res.ok) {
      attempts.push({ model: m, ok: true, text: String(res.text || "").slice(0, 240) })
    } else {
      attempts.push({ model: m, ok: false, error: res.error })
    }
  }

  const firstOk = attempts.find((a) => a.ok)
  return NextResponse.json({ attempts, successModel: firstOk?.model || null })
}
