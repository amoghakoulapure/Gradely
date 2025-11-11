import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "../../../../../lib/db"
import { getQueue } from "../../../../../lib/queue"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const submissionId = params.id
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } })
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  const run = await prisma.run.create({
    data: { submissionId, status: "PENDING", logs: "", metricsJSON: "" },
  })

  const q = getQueue()
  await q.add("grade", { submissionId, runId: run.id })

  return NextResponse.json(run)
}
