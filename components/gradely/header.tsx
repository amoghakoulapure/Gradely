"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"

export function GradelyHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={[
        "sticky top-0 z-40 border-b transition-all duration-300",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        "bg-background/70",
        scrolled ? "py-2" : "py-3",
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-7xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo image: place your logo at public/gradely-logo.png */}
          <div className="flex items-center gap-3">
            <Image src="/gradely-logo.svg" alt="Gradely logo" width={36} height={36} className="rounded-md" />
            <span className="font-semibold">Gradely</span>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/assignments" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Assignments
          </Link>
          <Link href="/teacher" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Teacher
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Login
          </Link>
          <Link href="/">
            <Button size="sm" className="glass-button">
              Open Editor
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
