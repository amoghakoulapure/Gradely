import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "../../../../../lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const runId = params.id

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let attempts = 0
      async function tick() {
        const run = await prisma.run.findUnique({ where: { id: runId } })
        if (!run) {
          controller.enqueue(encoder.encode(`event: end\ndata: {"error":"not_found"}\n\n`))
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ status: run.status, logs: run.logs })}\n\n`))
        attempts++
        if (run.status === "PASSED" || run.status === "FAILED" || attempts > 120) {
          controller.enqueue(encoder.encode(`event: end\ndata: {"done":true}\n\n`))
          controller.close()
        } else {
          setTimeout(tick, 1000)
        }
      }
      tick()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
