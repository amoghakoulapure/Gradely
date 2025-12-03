"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const SubmissionsPreviewModal = dynamic(() => import("@/components/gradely/submissions-preview-modal"), { ssr: false })
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GradelyHeader } from "@/components/gradely/header"

type Assignment = {
  id: string
  title: string
  description?: string
  language: "typescript" | "javascript" | "python" | "java" | "c" | "html"
  createdAt: number
}

export default function TeacherPage() {
  const [items, setItems] = useState<Assignment[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState<Assignment["language"]>("typescript")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewAssignmentId, setPreviewAssignmentId] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/assignments")
    const data = await res.json()
    setItems(data.items || [])
  }
  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": "TEACHER",
        },
        body: JSON.stringify({ title: title.trim(), description, language }),
      })
      if (!res.ok) throw new Error("Failed")
      setTitle("")
      setDescription("")
      await load()
    } catch (err) {
      console.error("Create assignment failed", err)
      setError("Unable to create assignment. Please ensure you are logged in as a teacher.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <GradelyHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold">Teacher</h1>

      <Card className="p-4 space-y-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Language</label>
          <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="c">C</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create assignment"}</Button>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Assignments</h2>
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.language} • {new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setPreviewAssignmentId(a.id); setShowPreview(true) }}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Preview submissions
                </button>
                <a href={`/assignments/${a.id}`} className="text-sm underline">Open</a>
              </div>
            </li>
          ))}
          {!items.length && <div className="text-sm text-muted-foreground">No assignments yet.</div>}
        </ul>
      </Card>
      {previewAssignmentId && (
        <SubmissionsPreviewModal assignmentId={previewAssignmentId} open={showPreview} onClose={() => setShowPreview(false)} />
      )}
    </main>
    </>
  )
}
