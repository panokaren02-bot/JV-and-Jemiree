"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Cinzel } from "next/font/google"
import { sectionBackground } from "@/lib/section-background"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const IVORY = "var(--color-motif-soft)"
const ACCENT = "var(--color-motif-accent)"
const BORDER = "color-mix(in srgb, var(--color-motif-accent) 30%, transparent)"
const BUTTON_BG = "var(--color-welcome-green)"

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const navbar = document.querySelector("nav") as HTMLElement | null
    if (navbar) navbar.style.display = "none"
    return () => {
      if (navbar) navbar.style.display = ""
    }
  }, [])

  return (
    <div style={{ background: sectionBackground }}>
      <div
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-motif-soft) 90%, transparent)",
          borderColor: BORDER,
          boxShadow: "0 4px 18px color-mix(in srgb, var(--color-welcome-navy) 8%, transparent)",
        }}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-3 sm:h-14 sm:px-6 lg:px-8">
          <Link
            href="/#gallery"
            onClick={() => sessionStorage.setItem("returnFromGallery", "true")}
            className={`${cinzel.className} inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-2 sm:text-[0.6875rem] sm:tracking-[0.2em]`}
            style={{
              background: BUTTON_BG,
              borderColor: BORDER,
              color: IVORY,
            }}
          >
            <span aria-hidden>←</span>
            <span className="hidden min-[400px]:inline">Back to main page</span>
            <span className="min-[400px]:hidden">Back</span>
          </Link>
          <div
            className={`${cinzel.className} text-[0.625rem] font-semibold uppercase tracking-[0.24em] sm:text-[0.6875rem] sm:tracking-[0.28em]`}
            style={{ color: ACCENT }}
          >
            Gallery
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
