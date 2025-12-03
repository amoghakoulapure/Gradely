"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function useProfile() {
  const [profile, setProfile] = useState<any | null>(null)
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { data } = await supabase.auth.getSession()
        const token = (data?.session as any)?.access_token
        if (!token) {
          setProfile(null)
          return
        }
        const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          setProfile(null)
          return
        }
        const json = await res.json()
        if (!mounted) return
        setProfile(json.profile ?? null)
      } catch (e) {
        console.error('useProfile error', e)
        if (mounted) setProfile(null)
      }
    }
    load()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (!session) setProfile(null)
      else {
        ;(async () => {
          try {
            const token = (session as any)?.access_token
            if (!token) return
            const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) { setProfile(null); return }
            const json = await res.json()
            setProfile(json.profile ?? null)
          } catch (e) {
            console.error(e)
            setProfile(null)
          }
        })()
      }
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  return profile
}
