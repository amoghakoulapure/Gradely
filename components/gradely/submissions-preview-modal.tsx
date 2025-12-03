"use client"

import React, { useEffect, useState } from "react"

type Submission = {
  id: string
  studentName?: string
  userEmail?: string
  code?: string
  language?: string
  createdAt?: string
}

export default function SubmissionsPreviewModal({ assignmentId, open, onClose }: { assignmentId: string; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Submission[] | null>(null)

  // Fetch once and reuse while component is mounted
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!open) return
      if (items) return // already loaded
      setLoading(true)
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/submissions/all`, { cache: "no-store" })
        if (!mounted) return
        if (!res.ok) {
          console.error("Failed to load submissions for preview", await res.text())
          setItems([])
        } else {
          const json = await res.json()
          setItems(json.items || [])
        }
      } catch (e) {
        console.error(e)
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [open, assignmentId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl h-[90vh] bg-white rounded shadow-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Preview submissions</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="p-4">Loading…</div>
          ) : !items || items.length === 0 ? (
            <div className="p-4">No submissions yet.</div>
          ) : (
            items.map((s) => (
              <div key={s.id} className="border rounded p-3 bg-gray-50">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{s.studentName || s.userEmail || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</div>
                  </div>
                  <div className="text-xs text-gray-500">{s.language || ''}</div>
                </div>
                <pre className="bg-black text-white p-3 rounded max-h-64 overflow-auto text-sm"><code>{s.code || ''}</code></pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
