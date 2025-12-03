"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function useSupabaseUser() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    async function fetchSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!mounted) return
        setUser(session?.user ?? null)
      } catch (err) {
        console.error("supabase getSession error", err)
      }
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  return user
}
