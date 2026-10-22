"use client"

import { useState, useEffect, useId, type FormEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { CheckCircle, AlertCircle, Heart, MessageSquare, User } from "lucide-react"
import { Cinzel } from "next/font/google"
import localFont from "next/font/local"
import { useSiteConfig } from "@/hooks/use-site-config"
import { sectionType, welcomeTitleSize } from "@/lib/section-typography"
import { invalidateInvitationData } from "@/lib/invitation-data"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const theSeasons = localFont({
  src: "../../Font/Fontspring-DEMO-theseasons-reg.otf",
  display: "swap",
  variable: "--font-the-seasons",
})

const aboveTheBeyond = localFont({
  src: "../../Font/above-the-beyond-script.otf",
  display: "swap",
  variable: "--font-above-beyond",
})

// Palette lives in globals.css → motif / welcome tokens.
const IVORY = "var(--color-motif-soft)"
const PAPER = "var(--color-welcome-bg-soft)"
const DEEP_GRADIENT =
  "linear-gradient(180deg, var(--color-motif-accent) 0%, var(--color-motif-deep) 55%, var(--color-welcome-navy) 100%)"
const HAIRLINE = "color-mix(in srgb, var(--color-motif-medium) 55%, transparent)"
const DARK_OVERLAY = "color-mix(in srgb, var(--color-welcome-navy) 55%, transparent)"

const palette = {
  body: "var(--color-welcome-text)",
  heading: "var(--color-welcome-navy)",
  accent: "var(--color-motif-accent)",
} as const

const cardStyle = {
  background: `linear-gradient(180deg, ${PAPER} 0%, var(--color-motif-cream) 100%)`,
  boxShadow:
    "0 30px 60px -24px color-mix(in srgb, var(--color-welcome-navy) 60%, transparent), inset 0 1px 0 rgb(255 255 255 / 80%)",
} as const

// 16px text on phones stops iOS from zooming into the field
const inputClass = `peer h-12 w-full rounded-xl border bg-[var(--color-motif-soft)] pl-10 pr-3.5 font-goudy-italic text-[16px] shadow-[inset_0_1px_2px_rgb(0_0_0/4%)] transition-all duration-200 outline-none hover:border-[var(--color-motif-accent)] focus:border-[var(--color-motif-accent)] focus:bg-white focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-motif-accent)_18%,transparent)] aria-[invalid=true]:border-[#B4533C] placeholder:text-[color-mix(in_srgb,var(--color-welcome-text-soft)_75%,transparent)] sm:text-[0.95rem]`

const inputStyle = {
  borderColor: HAIRLINE,
  color: palette.heading,
} as const

const labelClass = `${cinzel.className} mb-1.5 flex items-baseline justify-between gap-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] sm:text-[0.72rem]`

const iconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-welcome-text-soft)] transition-colors peer-focus:text-[var(--color-motif-accent)]"

const dividerLineStyle = {
  background: "linear-gradient(to right, transparent, var(--color-motif-medium), transparent)",
} as const

const primaryButtonStyle = {
  background: DEEP_GRADIENT,
  borderColor: "color-mix(in srgb, var(--color-motif-medium) 60%, transparent)",
  color: IVORY,
  boxShadow: "0 12px 24px -10px color-mix(in srgb, var(--color-welcome-navy) 60%, transparent)",
} as const

const noticeStyle = {
  background: "color-mix(in srgb, var(--color-motif-blush) 45%, var(--color-welcome-bg-soft))",
  borderColor: "color-mix(in srgb, var(--color-motif-accent) 45%, transparent)",
  color: "var(--color-welcome-navy)",
} as const

// Name only — each RSVP saves one seat
const EMPTY_FORM = { name: "" }
const SEATS_PER_RSVP = 1

function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (m, k) => (k in values ? String(values[k]) : m))
}

export function GuestList() {
  const siteConfig = useSiteConfig()
  const copy = siteConfig.rsvp
  const ids = useId()

  const [form, setForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Name + pax of the last saved RSVP — drives the thank-you dialog
  const [saved, setSaved] = useState<{ name: string; pax: number } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!saved) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSaved(null)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [saved])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()

    if (!name) {
      setError(copy.messages.nameRequired)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          name,
          allowedGuests: SEATS_PER_RSVP,
          status: "confirmed",
        }),
      })

      if (!response.ok) {
        // Don't show "thank you" when the sheet didn't save — let the guest try again
        console.warn("RSVP response was not OK:", response.status)
        setError(copy.messages.submitFailed)
        return
      }
    } catch (err) {
      console.error("Error submitting RSVP:", err)
      setError(copy.messages.submitFailed)
      return
    } finally {
      setIsSubmitting(false)
    }

    setSaved({ name, pax: SEATS_PER_RSVP })
    setForm(EMPTY_FORM)
    invalidateInvitationData("/api/guests")
    window.dispatchEvent(new Event("rsvpUpdated"))
  }

  const field = (id: string, label: ReactNode, icon: ReactNode, input: ReactNode) => (
    <div>
      <label htmlFor={`${ids}-${id}`} className={labelClass} style={{ color: palette.heading }}>
        {label}
      </label>
      <div className="relative">
        {input}
        {icon}
      </div>
    </div>
  )

  return (
    <div className={`${theSeasons.variable} ${aboveTheBeyond.variable} relative w-full overflow-visible`}>
      <section
        id="guest-list"
        className="relative z-30 scroll-mt-16 overflow-visible px-5 pb-10 pt-12 sm:scroll-mt-20 sm:px-8 sm:pb-12 sm:pt-14 md:scroll-mt-24"
      >
        <div
          className="relative mx-auto w-full max-w-[24rem] overflow-visible rounded-[1.85rem] px-5 pb-8 pt-6 text-center @container/rsvp sm:max-w-[26rem] sm:px-7 sm:pb-9 sm:pt-7"
          style={cardStyle}
        >
          {/* Inner frame line */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-2 rounded-[1.5rem] border sm:inset-2.5"
            style={{ borderColor: HAIRLINE }}
          />
          {copy.headerOrnament ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={copy.headerOrnament}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="relative mx-auto mb-3 block h-auto w-24 select-none sm:w-28"
            />
          ) : null}
          <h2
            className="welcome-title-lockup relative mx-auto w-full max-w-full text-center"
            style={
              {
                "--welcome-size": welcomeTitleSize.main,
                "--script-size": welcomeTitleSize.script,
              } as React.CSSProperties
            }
          >
            <span className="sr-only">{copy.title}. {copy.script}?</span>
            <span
              aria-hidden
              className={`${theSeasons.className} block uppercase leading-[0.9] tracking-[0.08em] min-[400px]:tracking-[0.11em] sm:tracking-[0.13em] md:tracking-[0.14em]`}
              style={{ fontSize: "var(--welcome-size)", color: "var(--color-welcome-navy)" }}
            >
              {copy.title}
            </span>
            <span
              aria-hidden
              className={`${aboveTheBeyond.className} relative z-10 mx-auto mt-1.5 block w-fit max-w-full px-1 leading-[0.88] sm:mt-2 sm:leading-[0.9]`}
              style={{
                fontSize: "var(--script-size)",
                color: "var(--color-welcome-script)",
                textShadow: "0 1px 0 var(--color-motif-soft)",
              }}
            >
              {copy.script}
              <span className={`${cinzel.className} relative -top-[0.06em] ml-[0.04em] inline-block font-normal`}>
                ?
              </span>
            </span>
          </h2>

          <p
            className={`font-goudy-italic mx-auto mt-3 max-w-[17.5rem] ${sectionType.textSnug} sm:mt-4`}
            style={{ color: palette.body }}
          >
            {copy.intro}
          </p>

          {siteConfig.details.rsvp.deadline ? (
            <p
              className={`${cinzel.className} ${sectionType.label} mx-auto mt-4 font-semibold uppercase tracking-[0.16em] sm:mt-5 sm:tracking-[0.18em]`}
              style={{ color: palette.accent }}
            >
              {copy.deadlineLabel}
              <span
                className={`${theSeasons.className} mt-2 block text-[1.45rem] font-normal normal-case leading-tight tracking-[0.04em] sm:text-[1.75rem] md:text-[1.95rem]`}
                style={{ color: palette.heading }}
              >
                {siteConfig.details.rsvp.deadline.replace(/\.\s*$/, "")}
              </span>
            </p>
          ) : null}

          <div className="relative mx-auto my-5 flex max-w-[14rem] items-center gap-3 sm:my-6" aria-hidden>
            <span className="h-px flex-1" style={dividerLineStyle} />
            <Heart className="h-2.5 w-2.5 flex-shrink-0" style={{ color: palette.accent, fill: palette.accent }} />
            <span className="h-px flex-1" style={dividerLineStyle} />
          </div>

          <form className="relative space-y-4 text-left sm:space-y-5" onSubmit={handleSubmit} noValidate>
            {field(
              "name",
              <span>
                {copy.form.nameLabel}
                <span aria-hidden style={{ color: palette.accent }}> *</span>
              </span>,
              <User className={iconClass} aria-hidden />,
              <input
                id={`${ids}-name`}
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                required
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                  if (error) setError(null)
                }}
                placeholder={copy.form.namePlaceholder}
                className={inputClass}
                style={inputStyle}
                aria-invalid={error === copy.messages.nameRequired}
              />,
            )}

            {error ? (
              <div
                role="alert"
                className="font-goudy-italic flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                style={noticeStyle}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: palette.accent }} />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${cinzel.className} ${sectionType.label} !mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border px-6 py-2.5 font-semibold uppercase tracking-[0.14em] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100`}
              style={primaryButtonStyle}
            >
              {isSubmitting ? copy.form.submitting : copy.form.submit}
            </button>
          </form>
        </div>
      </section>

      {/* Thank-you dialog — portaled to escape parent stacking contexts */}
      {isMounted && saved && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5 backdrop-blur-md animate-in fade-in duration-200 sm:p-8"
          style={{ background: DARK_OVERLAY }}
          onClick={() => setSaved(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rsvp-success-title"
            className="w-full max-w-sm animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl" style={cardStyle}>
              <div aria-hidden className="h-[3px] w-full" style={{ background: DEEP_GRADIENT }} />
              <div className="px-6 pb-6 pt-6 text-center">
                <div className="relative mb-4 inline-flex items-center justify-center">
                  <div
                    className="absolute h-14 w-14 animate-ping rounded-full"
                    style={{
                      animationDuration: "2.5s",
                      backgroundColor: "color-mix(in srgb, var(--color-motif-accent) 22%, transparent)",
                    }}
                  />
                  <div
                    className="relative flex h-12 w-12 items-center justify-center rounded-full shadow-md"
                    style={{ background: DEEP_GRADIENT }}
                  >
                    <CheckCircle className="h-6 w-6" style={{ color: IVORY }} strokeWidth={2} />
                  </div>
                </div>

                <h4
                  id="rsvp-success-title"
                  className={`${theSeasons.className} mb-1 text-base uppercase tracking-[0.12em]`}
                  style={{ color: palette.heading }}
                >
                  {copy.success.title}
                </h4>
                <p className="font-goudy-italic text-sm leading-snug" style={{ color: palette.body }}>
                  {fillText(copy.success.text, {
                    name: saved.name,
                    count: `${saved.pax} ${saved.pax === 1 ? copy.success.seatSingular : copy.success.seatPlural}`,
                  })}
                </p>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1" style={dividerLineStyle} />
                  <Heart className="h-2.5 w-2.5 flex-shrink-0" style={{ color: palette.accent }} />
                  <span className="h-px flex-1" style={dividerLineStyle} />
                </div>

                <p className="font-goudy-italic mb-4 text-sm leading-relaxed" style={{ color: palette.body }}>
                  {copy.success.messagePrompt}
                </p>

                <a
                  href="#messages"
                  onClick={() => {
                    setSaved(null)
                    setTimeout(() => {
                      document.getElementById("messages")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }, 100)
                  }}
                  className={`${cinzel.className} mb-3 inline-flex w-full items-center justify-center gap-2 rounded-full border py-3 ${sectionType.label} font-semibold uppercase tracking-[0.2em] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]`}
                  style={primaryButtonStyle}
                >
                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  {copy.success.messageButton}
                </a>

                <button
                  type="button"
                  onClick={() => setSaved(null)}
                  className={`font-goudy-italic ${sectionType.label} tracking-wide transition-colors duration-200`}
                  style={{ color: palette.body }}
                >
                  {copy.success.laterButton}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
