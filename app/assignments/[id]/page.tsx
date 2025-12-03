"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CodeEditor, type EditorHandle } from "@/components/gradely/code-editor"
import { ReviewPanel, type ReviewIssue, type ReviewResult } from "@/components/gradely/review-panel"

const DEFAULT_CODE: Record<string, string> = {
  typescript: "function add(a: number, b: number){return a+b}\nconsole.log(add(2,3))\n",
  javascript: "function add(a,b){return a+b}\nconsole.log(add(2,3))\n",
  python: "def add(a,b):\n    return a+b\nprint(add(2,3))\n",
  java: "public class Main{static int add(int a,int b){return a+b;}public static void main(String[] args){System.out.println(add(2,3));}}\n",
  c: "#include <stdio.h>\nint add(int a,int b){return a+b;}\nint main(){printf(\"%d\", add(2,3));return 0;}\n",
  html: "<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>Gradely</title></head><body><h1>Hello</h1></body></html>\n",
}

export default function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [assignment, setAssignment] = useState<any>(null)
  const [language, setLanguage] = useState<string>("typescript")
  const [review, setReview] = useState<ReviewResult | null>(null)
  const [issues, setIssues] = useState<ReviewIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [studentName, setStudentName] = useState<string>("")
  const editorRef = useRef<EditorHandle | null>(null)

  useEffect(() => {
    fetch("/api/assignments").then((r) => r.json()).then((d) => {
      const a = (d.items || []).find((x: any) => x.id === id)
      if (a) {
        setAssignment(a)
        setLanguage(a.language)
      }
    })
  }, [id])

  // If a `submissionId` is present in the query, fetch that submission and open its review
  useEffect(() => {
    try {
      const params = new URL(window.location.href).searchParams
      const submissionId = params.get("submissionId")
      if (!submissionId) return
      ;(async () => {
        try {
          const res = await fetch(`/api/submissions/${submissionId}`)
          if (!res.ok) return
          const data = await res.json()
          if (data?.code && editorRef.current) {
            editorRef.current.setValue(data.code)
          }
          // If review present, set review panel
          if (data?.reviewSummary) {
            setReview({ summary: data.reviewSummary, issues: JSON.parse(data.reviewIssuesJSON || "[]") })
            setIssues(JSON.parse(data.reviewIssuesJSON || "[]"))
            editorRef.current?.setMarkers(JSON.parse(data.reviewIssuesJSON || "[]"))
          }
        } catch (e) {
          // ignore
        }
      })()
    } catch (e) {}
  }, [])

  const initialCode = useMemo(() => DEFAULT_CODE[language] || "", [language])

  async function submit() {
    const code = editorRef.current?.getValue() || ""
    if (!code.trim()) return
    setLoading(true)
    setReview(null)
    setIssues([])
    try {
      const res = await fetch(`/api/assignments/${id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, studentName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed")
      setReview(data.review)
      setIssues(data.review?.issues || [])
      editorRef.current?.setMarkers(data.review?.issues || [])
    } catch (e) {
      setReview({ summary: "Submission failed. Please try again.", issues: [] })
      setIssues([])
      editorRef.current?.setMarkers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">{assignment?.title || "Assignment"}</h1>
      {assignment?.description && (
        <div className="text-sm text-muted-foreground">{assignment.description}</div>
      )}

      <Card className="p-4 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <CodeEditor
            key={language}
            language={language}
            initialValue={initialCode}
            onMount={(h) => (editorRef.current = h)}
            storageKey={`gradely:assignment:${id}`}
          />
        </div>
        <div className="md:col-span-1 space-y-3">
          <div>
            <label className="text-sm font-medium">Student name</label>
            <Input placeholder="Student name" value={studentName} onChange={(e) => setStudentName((e.target as HTMLInputElement).value)} />
          </div>
          <Button onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit"}</Button>
          <ReviewPanel review={review} issues={issues} onJumpToLine={(line) => editorRef.current?.revealLine(line)} />
        </div>
      </Card>
    </main>
  )
}
