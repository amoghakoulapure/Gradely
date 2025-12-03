"use client"

import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export type OutputState = {
  status: "success" | "error" | "info"
  message: string
  details?: string[]
}

const statusTokens: Record<OutputState["status"], { label: string; dot: string; text: string }> = {
  success: { label: "Passed", dot: "bg-emerald-500", text: "text-emerald-600" },
  error: { label: "Blocked", dot: "bg-red-500", text: "text-red-500" },
  info: { label: "Running", dot: "bg-sky-500", text: "text-sky-500" },
}

function formatTimestamp(date: Date | null) {
  if (!date) return "Not run yet"
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

export function OutputPanel({ output, lastRunAt }: { output: OutputState | null; lastRunAt?: Date | null }) {
  const meta = output ? statusTokens[output.status] : null
  const logs = output?.details?.length ? output.details : output ? [output.message] : ["Awaiting analysis run…"]

  return (
    <Card className="flex flex-col overflow-hidden border border-border/70 shadow-sm" aria-live="polite">
      <div className="flex items-center justify-between bg-muted/70 px-4 py-2 border-b">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
          <span className={cn("h-2.5 w-2.5 rounded-full", meta?.dot ?? "bg-muted-foreground/50")}></span>
          <span>Output Console</span>
          {meta && <span className={cn("uppercase", meta.text)}>{meta.label}</span>}
        </div>
        <div className="text-xs text-muted-foreground">{formatTimestamp(lastRunAt ?? null)}</div>
      </div>

      <div className={cn("px-4 py-3 text-sm border-b", meta?.text ?? "text-muted-foreground")}>{output?.message ?? "Click \"Analyze Code\" to review execution status."}</div>

      <ScrollArea className="flex-1">
        <div className="bg-secondary/30 font-mono text-sm px-4 py-3 min-h-[150px] space-y-2">
          {logs.map((line, idx) => (
            <pre key={idx} className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              <span className="text-muted-foreground mr-2">{String(idx + 1).padStart(2, "0")}│</span>
              {line}
            </pre>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
