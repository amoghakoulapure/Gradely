"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

const SubmissionsPreviewModal = dynamic(() => import("../../../../components/gradely/submissions-preview-modal"), { ssr: false })

export default function SubmissionsList({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  async function fetchPage() {
    setLoading(true)
    try {
      const token = null
      const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) q.set("search", search)
      const res = await fetch(`/api/assignments/${id}/submissions/summary?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        console.error("Failed to load submissions", await res.text())
        setItems([])
        setTotal(0)
      } else {
        const json = await res.json()
        setItems(json.items || [])
        setTotal(Number(json.total || 0))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="p-6">Please sign in as a teacher to view submissions.</div>
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <div>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-primary text-white rounded shadow-sm"
          >
            Preview submissions
          </button>
        </div>
      </div>

      <SubmissionsPreviewModal open={showPreview} onClose={() => setShowPreview(false)} assignmentId={id} />

      <div className="mb-4 flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name or email" className="border rounded px-3 py-2 flex-1" />
        <button onClick={() => { setPage(1); fetchPage() }} className="px-4 py-2 bg-primary text-white rounded">Search</button>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Student</th>
              <th className="p-3 text-left">Attempts</th>
              <th className="p-3 text-left">Last submitted</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-4">No submissions found.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.userId} className="border-t">
                  <td className="p-3">{it.name || it.email}</td>
                  <td className="p-3">{it.attemptsCount}</td>
                  <td className="p-3">{it.latestSubmission?.createdAt ? new Date(it.latestSubmission.createdAt).toLocaleString() : '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${it.status === 'REVIEWED' ? 'bg-green-100 text-green-800' : it.status === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                      {it.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {it.latestSubmission?.id ? (
                      <button
                        onClick={() => router.push(`/assignments/${id}?submissionId=${it.latestSubmission.id}`)}
                        className="px-3 py-1 rounded border mr-2"
                      >
                        Open review
                      </button>
                    ) : null}
                    {it.latestSubmission?.id ? (
                      <button
                        onClick={() => router.push(`/assignments/${id}/submissions/preview/${it.latestSubmission.id}`)}
                        className="px-3 py-1 rounded border"
                      >
                        Preview
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>Showing {(page-1)*pageSize + 1}–{Math.min(page*pageSize, total)} of {total}</div>
        <div className="flex gap-2">
          <button disabled={page<=1} onClick={() => setPage((p) => Math.max(1, p-1))} className="px-3 py-1 border rounded">Prev</button>
          <button disabled={page*pageSize >= total} onClick={() => setPage((p) => p+1)} className="px-3 py-1 border rounded">Next</button>
        </div>
      </div>
    </main>
  )
}
