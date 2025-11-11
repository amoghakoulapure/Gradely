import { NextResponse } from "next/server"
import { callHfModel } from "../../../lib/hf"

export async function GET() {
  const models = [
    process.env.REVIEW_PRIMARY_MODEL || "HuggingFaceH4/zephyr-7b-beta",
    process.env.REVIEW_SECONDARY_MODEL || "mistralai/Mistral-7B-Instruct-v0.2",
    process.env.REVIEW_TERTIARY_MODEL || "bigcode/starcoder2-7b",
    process.env.REVIEW_QUATERNARY_MODEL || "bigcode/starcoder2-3b",
    process.env.REVIEW_FALLBACK_MODEL || "bigcode/starcoder2-3b",
  ]

  const prompt = "Say 'ok' and then your model id.";
  const attempts: Array<{ model: string; ok: boolean; text?: string; error?: string }> = []

  for (const m of models) {
    const res = await callHfModel(m, prompt, { max_new_tokens: m.includes("gpt2") ? 16 : 64 })
    if (res.ok) {
      attempts.push({ model: m, ok: true, text: String(res.text).slice(0, 240) })
    } else {
      attempts.push({ model: m, ok: false, error: res.error })
    }
  }

  const firstOk = attempts.find((a) => a.ok)
  return NextResponse.json({ attempts, successModel: firstOk?.model || null })
}
