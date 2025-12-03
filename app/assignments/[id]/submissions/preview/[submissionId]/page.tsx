"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"

export default function SubmissionPreview({ params }: { params: { id: string; submissionId: string } }) {
  const { id, submissionId } = params
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/submissions/${submissionId}`, { cache: "no-store" })
        if (!mounted) return
        if (!res.ok) {
          console.error("Failed to load submission", await res.text())
          setSubmission(null)
        } else {
          setSubmission(await res.json())
        }
      } catch (e) {
        console.error(e)
        setSubmission(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [submissionId])

  if (loading) return <div className="p-6">Loading…</div>
  if (!submission) return <div className="p-6">Submission not found.</div>

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preview: {submission.studentName || submission.userEmail || 'Unknown'}</h1>
        <div className="flex gap-2">
          <Link href={`/assignments/${id}?submissionId=${submissionId}`} className="px-3 py-1 border rounded">Open in editor</Link>
          <Link href={`/assignments/${id}/submissions`} className="px-3 py-1 border rounded">Back to list</Link>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Code ({submission.language || 'unknown'})</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto"><code>{submission.code || ''}</code></pre>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Review summary</h2>
        <div className="prose max-w-none"><pre>{submission.reviewSummary || '—'}</pre></div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Review issues (JSON)</h2>
        <pre className="bg-gray-50 p-3 rounded overflow-auto">{submission.reviewIssuesJSON || '[]'}</pre>
      </section>
    </main>
  )
}
