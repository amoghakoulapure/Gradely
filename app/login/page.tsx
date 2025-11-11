"use client"

import { useState } from "react"
import Link from "next/link"

type Role = "teacher" | "student"

// Mocked client-side authentication function.
// In production this would call your backend API over HTTPS.
async function mockAuthenticate(email: string, password: string, role: Role) {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 600))

  // Simple mocked credentials for demo purposes
  const valid =
    (role === "teacher" && email === "teacher@example.com" && password === "teacherpass") ||
    (role === "student" && email === "student@example.com" && password === "studentpass")

  if (valid) {
    return { ok: true, user: { email, role } }
  }
  const err: any = new Error("Invalid email, password, or role")
  err.code = 401
  throw err
}

// Utility wrapper showing try/catch around fetch calls; use to call real APIs safely.
export async function safeApiCall(input: RequestInfo, init?: RequestInit) {
  try {
    const res = await fetch(input, init)
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      throw new Error(`Request failed ${res.status}: ${txt}`)
    }
    return await res.json()
  } catch (err) {
    // Surface for debug, but do not leak secrets to UI
    console.error("safeApiCall error:", err)
    throw err
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function validate() {
    setError(null)
    if (!email || !/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email)) {
      setError("Please enter a valid email address.")
      return false
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.")
      return false
    }
    return true
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    if (!validate()) return
    setLoading(true)
    setError(null)
    try {
      // NOTE: wrap backend calls in try/catch to handle network failures / rejections
      const res = await mockAuthenticate(email.trim().toLowerCase(), password, role)
      if (res?.ok) {
        setSuccessMsg(`Welcome back, ${role === "teacher" ? "Teacher" : "Student"}!`)
        setError(null)
        // In production: redirect to role-specific dashboard, set auth cookie, etc.
      }
    } catch (err: any) {
      // Show a user-friendly message; log details for debugging
      console.error("Authentication failed:", err)
      if (err?.code === 401) setError("Incorrect email, password, or role. Please try again.")
      else setError("Network or server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <main className="w-full max-w-md bg-background/80 backdrop-blur rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome to Gradely</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {role === "teacher" ? "Teacher portal — access your class tools and reviews." : "Student portal — submit code and view feedback."}
        </p>

        <form onSubmit={onSubmit} aria-describedby={error ? "login-error" : undefined}>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required
            aria-label="Email address"
          />

          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required
            aria-label="Password"
          />

          <fieldset className="mb-4">
            <legend className="text-sm font-medium">Role</legend>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                />
                <span>Student</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => setRole("teacher")}
                />
                <span>Teacher</span>
              </label>
            </div>
          </fieldset>

          {error && (
            <div id="login-error" role="alert" className="text-red-600 text-sm mb-3">
              {error}
            </div>
          )}

          {successMsg && (
            <div role="status" className="text-green-600 text-sm mb-3">
              {successMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-white disabled:opacity-60"
              disabled={loading}
              aria-disabled={loading}
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </div>
        </form>

        <hr className="my-4" />

        <section className="text-xs text-muted-foreground">
          <strong>Developer notes</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>To test the mock login: teacher@example.com / teacherpass (Teacher)</li>
            <li>To test the mock login: student@example.com / studentpass (Student)</li>
            <li>
              When clicking "Analyze Code" in the editor UI, open your browser DevTools &gt; Network panel and look for failed
              requests (status 4xx/5xx). Any fetch calls should be wrapped in try/catch — see <code>safeApiCall</code> for an
              example.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
