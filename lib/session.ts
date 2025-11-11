import { cookies } from "next/headers"

export type SessionConfig = {
  hfKey?: string
}

const sessions = new Map<string, SessionConfig>()

export async function getOrCreateSessionId() {
  const jar = await cookies()
  const existing = jar.get("gradelySession")?.value
  if (existing) return existing
  const sid = crypto.randomUUID()
  // 7 days, httpOnly off due to Next.js route constraints
  jar.set("gradelySession", sid, { path: "/", maxAge: 60 * 60 * 24 * 7 })
  return sid
}

export async function getSession(): Promise<{ id: string; cfg: SessionConfig }> {
  const id = await getOrCreateSessionId()
  if (!sessions.has(id)) sessions.set(id, {})
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { id, cfg: sessions.get(id)! }
}

export function setSession(id: string, cfg: SessionConfig) {
  sessions.set(id, cfg)
}
