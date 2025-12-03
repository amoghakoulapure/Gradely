"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../lib/supabaseClient"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("student")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  function validate() {
    setError(null)
    if (!name || !name.trim()) { setError('Please enter your name'); return false }
    if (!email || !/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email)) {
      setError("Please enter a valid email address.")
      return false
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.")
      return false
    }
    // basic strength: include letter and number
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include letters and numbers')
      return false
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return false
    }
    return true
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    if (!validate()) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password }, { data: { name } })
      if (signUpError) throw signUpError

      // If the project requires email confirmation, session may be null. In many Supabase setups a confirmation
      // email is sent. Our DB trigger will create public.users when auth.users gets a row.
      if (data?.user) {
        // If a session exists, redirect to post-login choices; otherwise show success message and prompt to login
        const { data: sessionData } = await supabase.auth.getSession()
        const token = (sessionData as any)?.session?.access_token
        if (token) {
          // create profile server-side
          await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, role }) })
          // redirect based on role
          if (role === 'teacher') router.push('/teacher')
          else router.push('/assignments')
          return
        }
        setSuccessMsg('Account created. Please check your email to confirm, then log in.')
      } else {
        setSuccessMsg('If the signup succeeded, check your email for a confirmation link, then log in.')
      }
    } catch (err: any) {
      console.error('Signup error', err)
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <main className="w-full max-w-md bg-background/80 backdrop-blur rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-2">Create an account</h1>

        <form onSubmit={onSubmit} aria-describedby={error ? 'signup-error' : undefined}>
          <label className="block text-sm font-medium">Full name</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required
          />

          <label className="block text-sm font-medium">Role</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Select role"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required
          />

          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required
          />

          <label className="block text-sm font-medium">Confirm password</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border px-3 py-2 mb-3"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            aria-required
          />

          {error && (
            <div id="signup-error" role="alert" className="text-red-600 text-sm mb-3">
              {error}
            </div>
          )}

          {successMsg && <div role="status" className="text-green-600 text-sm mb-3">{successMsg}</div>}

          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-white disabled:opacity-60"
              disabled={loading}
              aria-disabled={loading}
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>

        <hr className="my-4" />

        <p className="text-sm text-muted-foreground">Already have an account? <button className="text-primary underline" onClick={() => router.push('/login')}>Log in</button></p>

        <section className="text-xs text-muted-foreground mt-4">
          <strong>Developer notes</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>To test the mock login: teacher@example.com / teacherpass (Teacher)</li>
            <li>To test the mock login: student@example.com / studentpass (Student)</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
