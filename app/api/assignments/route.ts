import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "../../../lib/db"
import { sanitizePayload } from "../../../lib/model-client"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"

export async function GET() {
  const items = await prisma.assignment.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const role = (session as any)?.user?.role || "STUDENT"
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const raw = await req.json().catch(() => ({}))
    const body = sanitizePayload(raw) || {}
    const title = String(body.title || "").trim()
    const description = body.description ? String(body.description) : undefined
    const language = String(body.language || "")

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 })
    if (!language || !["typescript", "javascript", "python", "java", "c", "html"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }

    const created = await prisma.assignment.create({
      data: { title, description, language },
    })
    return NextResponse.json(created)
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
