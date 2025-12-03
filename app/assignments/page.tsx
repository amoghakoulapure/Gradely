"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GradelyHeader } from "@/components/gradely/header"
import { Card } from "@/components/ui/card"

type Assignment = {
  id: string
  title: string
  description?: string
  language: "typescript" | "javascript" | "python" | "java" | "c" | "html"
  createdAt: number
}

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([])
  const router = useRouter()
  useEffect(() => {
    async function init() {
      fetch("/api/assignments").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([]))
    }
    init()
  }, [])

  return (
    <>
      <GradelyHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Assignments</h1>
      <Card className="p-4">
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                {a.description && <div className="text-sm text-muted-foreground">{a.description}</div>}
                <div className="text-xs text-muted-foreground">{a.language} • {new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <a href={`/assignments/${a.id}`} className="text-sm underline">Open</a>
            </li>
          ))}
          {!items.length && <div className="text-sm text-muted-foreground">No assignments yet.</div>}
        </ul>
      </Card>
    </main>
    </>
  )
}
