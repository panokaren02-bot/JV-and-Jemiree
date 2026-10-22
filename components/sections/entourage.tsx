"use client"

import React from "react"
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import localFont from "next/font/local"
import { Section } from "@/components/section"
import { sectionType } from "@/lib/section-typography"
import { Cinzel } from "next/font/google"
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react"
import { useSiteConfig } from "@/hooks/use-site-config"
import { fetchUntilReady, isAbortError } from "@/lib/fetch-until-ready"
import { fetchInvitationList, readCachedInvitationList } from "@/lib/invitation-data"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
const PAPER = "var(--color-welcome-bg-soft)"
const ACCENT = "var(--color-motif-accent)"
const NAVY = "var(--color-welcome-navy)"
const SCRIPT = "var(--color-welcome-script)"
const BODY = "var(--color-welcome-text)"
const HAIRLINE = "color-mix(in srgb, var(--color-motif-medium) 60%, transparent)"

const sectionBg = `
  radial-gradient(820px 460px at 50% 0%, color-mix(in srgb, var(--color-motif-silver) 75%, transparent) 0%, transparent 65%),
  radial-gradient(560px 380px at 0% 60%, color-mix(in srgb, var(--color-motif-blush) 30%, transparent) 0%, transparent 60%),
  radial-gradient(560px 380px at 100% 85%, color-mix(in srgb, var(--color-motif-blush) 30%, transparent) 0%, transparent 60%),
  linear-gradient(180deg, var(--color-welcome-bg-soft) 0%, var(--color-motif-cream) 100%)
`.trim()

const dividerLineStyle = {
  background: "linear-gradient(to right, transparent, var(--color-motif-medium), transparent)",
} as const

const cardStyle = {
  background: `linear-gradient(180deg, color-mix(in srgb, ${PAPER} 90%, transparent) 0%, color-mix(in srgb, var(--color-motif-cream) 92%, transparent) 100%)`,
  boxShadow:
    "0 26px 56px -30px color-mix(in srgb, var(--color-welcome-navy) 55%, transparent), inset 0 1px 0 rgb(255 255 255 / 80%)",
} as const

const CORNER_DECO_CLASS =
  "block h-auto w-auto max-w-[130px] sm:max-w-[200px] md:max-w-[260px] lg:max-w-[320px] select-none opacity-90"

const palette = {
  body: BODY,
  heading: NAVY,
  label: ACCENT,
  accent: ACCENT,
} as const

function DecoImg({ src, className }: { src: string; className: string }) {
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} loading="lazy" decoding="async" alt="" aria-hidden="true" className={className} />
  )
}

function OutsideDivider() {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="h-px w-10 sm:w-16" style={{ background: "linear-gradient(to right, transparent, var(--color-motif-medium))" }} />
      <span className="h-1.5 w-1.5 rotate-45" style={{ background: ACCENT }} aria-hidden />
      <span className="h-px w-10 sm:w-16" style={{ background: "linear-gradient(to left, transparent, var(--color-motif-medium))" }} />
    </div>
  )
}

const revealEase = [0.22, 1, 0.36, 1] as const

// Each part of the list reveals its heading and names one after another
const revealGroup: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}

const revealItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(3px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: revealEase } },
}

// Leaf-and-diamond rule between the major parts of the list; draws outward from the center
function Flourish() {
  const reduceMotion = useReducedMotion()
  const line = (side: "left" | "right") => (
    <motion.span
      className="h-px w-12 sm:w-20"
      style={{
        background: `linear-gradient(to ${side}, transparent, var(--color-motif-medium))`,
        transformOrigin: side === "left" ? "right" : "left",
      }}
      initial={reduceMotion ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.1, ease: revealEase, delay: 0.15 }}
    />
  )
  return (
    <div className="my-5 flex items-center justify-center gap-1.5 sm:my-6 sm:gap-2 md:my-7" aria-hidden>
      {line("left")}
      <span className="h-1 w-1 rotate-45 opacity-60" style={{ background: ACCENT }} />
      <motion.span
        className="h-1.5 w-1.5"
        style={{ background: ACCENT }}
        initial={reduceMotion ? false : { rotate: -135, scale: 0 }}
        whileInView={{ rotate: 45, scale: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.9, ease: revealEase }}
      />
      <span className="h-1 w-1 rotate-45 opacity-60" style={{ background: ACCENT }} />
      {line("right")}
    </div>
  )
}

function ColumnSpine() {
  return (
    <span
      className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2"
      style={{ background: "linear-gradient(to bottom, transparent, var(--color-motif-medium) 15%, var(--color-motif-medium) 85%, transparent)", opacity: 0.55 }}
      aria-hidden
    />
  )
}

function Reveal({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div>{children}</div>
  return (
    <motion.div variants={revealGroup} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
      {children}
    </motion.div>
  )
}

// Fixed positions (no randomness) so server and client render the same markup.
// left %, size px, fall duration s, start offset s, sway px, start angle, opacity
const LEAVES = [
  [4, 18, 26, -3, 40, 10, 0.5],
  [13, 12, 32, -18, -30, 70, 0.4],
  [22, 22, 29, -9, 50, -20, 0.45],
  [31, 10, 35, -25, -40, 120, 0.35],
  [42, 16, 27, -14, 35, 40, 0.4],
  [53, 13, 33, -5, -45, -60, 0.35],
  [61, 20, 30, -21, 30, 15, 0.45],
  [70, 11, 36, -11, -35, 90, 0.35],
  [79, 17, 28, -27, 45, -35, 0.45],
  [88, 14, 31, -7, -30, 55, 0.4],
  [95, 19, 34, -16, 35, -10, 0.45],
  [48, 9, 38, -31, 25, 160, 0.3],
] as const

// left %, top %, size px, twinkle duration s, start offset s
const GLINTS = [
  [8, 12, 5, 4.5, -1],
  [91, 18, 4, 5.5, -3],
  [16, 38, 4, 6, -2],
  [84, 44, 5, 5, -4],
  [6, 66, 4, 4.8, -0.5],
  [94, 72, 5, 6.2, -2.5],
  [20, 88, 4, 5.2, -3.5],
  [78, 92, 4, 4.4, -1.5],
] as const

function EucalyptusLeaf({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5C6.2 6.6 5.2 14.6 12 21.5C18.8 14.6 17.8 6.6 12 2.5Z"
        fill="var(--color-motif-medium)"
      />
      <path d="M12 5v15" stroke="var(--color-motif-cream)" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

// Slow drifting glow, falling eucalyptus leaves and soft glints behind the section
function EntourageAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <span
        className="ent-glow absolute -left-24 top-[8%] h-80 w-80 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--color-motif-silver) 70%, transparent)", "--dur": "22s", "--dx": "60px", "--dy": "40px" } as React.CSSProperties}
      />
      <span
        className="ent-glow absolute -right-24 top-[40%] h-96 w-96 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--color-motif-blush) 45%, transparent)", "--dur": "28s", "--dx": "-70px", "--dy": "-50px" } as React.CSSProperties}
      />
      <span
        className="ent-glow absolute left-[20%] bottom-[4%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--color-motif-medium) 22%, transparent)", "--dur": "25s", "--dx": "50px", "--dy": "-60px" } as React.CSSProperties}
      />
      {LEAVES.map(([left, size, dur, delay, sway, angle, opacity], i) => (
        <span
          key={`leaf-${i}`}
          className="ent-leaf"
          style={
            {
              left: `${left}%`,
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
              "--sway": `${sway}px`,
              "--r0": `${angle}deg`,
              "--o": opacity,
            } as React.CSSProperties
          }
        >
          <EucalyptusLeaf size={size} />
        </span>
      ))}
      {GLINTS.map(([left, top, size, dur, delay], i) => (
        <span
          key={`glint-${i}`}
          className="ent-glint absolute"
          style={
            {
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: "var(--color-motif-accent)",
              boxShadow: "0 0 8px var(--color-motif-accent)",
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

const SECTION_TITLE_CLASS = `${aboveTheBeyond.className} leading-[1.3] [text-wrap:balance]`
const SECTION_TITLE_SIZE = {
  // Headings stay in proportion to the shared name size
  single: "text-[length:calc(var(--name-size,1rem)*1.75)]",
  pair: "whitespace-nowrap text-[length:var(--pair-title-size,1.45rem)]",
} as const

// Every name shares one size (--name-size), shrunk until the longest fits on one line
const nameStyle: React.CSSProperties = {
  fontSize: "var(--name-size, 1rem)",
  lineHeight: 1.35,
  letterSpacing: "0.01em",
}

// Groom & Bride: same size, set in capitals
const coupleNameStyle: React.CSSProperties = {
  ...nameStyle,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
}

// px: [largest, smallest] for each shared-size group. Paired headings are never
// larger than single headings (name size × HEADING_SCALE).
const HEADING_SCALE = 1.75
const FIT_GROUPS = [
  ["name", "--name-size", 17, 8],
  ["pair-title", "--pair-title-size", 30, 12],
] as const

/** Gives each data-fit group under `ref` one font size, the largest at which none of its lines wrap or overflow. */
function useSharedFit(ref: React.RefObject<HTMLElement | null>, deps: React.DependencyList) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const fit = () => {
      let nameSize = 16
      for (const [group, prop, largest, min] of FIT_GROUPS) {
        const els = root.querySelectorAll<HTMLElement>(`[data-fit="${group}"]`)
        if (els.length === 0) continue
        const max = group === "pair-title" ? Math.min(largest, nameSize * HEADING_SCALE) : largest
        root.style.setProperty(prop, `${max}px`)
        let ratio = 1
        els.forEach((el) => {
          if (el.scrollWidth > el.clientWidth) ratio = Math.min(ratio, el.clientWidth / el.scrollWidth)
        })
        const size = Math.max(min, Math.floor(max * ratio * 0.97 * 10) / 10)
        root.style.setProperty(prop, `${size}px`)
        if (group === "name") nameSize = size
      }
    }
    fit()
    // Refit when the width changes (rotation, resize) and once the fonts arrive
    let lastWidth = root.clientWidth
    const observer = new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return
      lastWidth = root.clientWidth
      fit()
    })
    observer.observe(root)
    void document.fonts?.ready.then(fit)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

const roleTitleStyle: React.CSSProperties = {
  fontSize: "clamp(0.5rem, min(1.55vw, 3.5cqi), 0.68rem)",
  lineHeight: 1.1,
}

const ROMAN_NUMERAL = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)$/i
const SPECIAL_GLYPH = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|&|\+|[.’'`´-]|—|–)$/i
const SPECIAL_SPLIT = /(\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\b|&|\+|[.’'`´-]|—|–)/g
const DASH_GLYPH = /^[-—–]$/
const PLUS_GLYPH = /^\+$/

function toDisplayName(value: string) {
  const trimmed = value.trim()
  // In a mixed-case name, short all-caps words are initials ("JV") — keep them
  const isAllCaps = trimmed === trimmed.toUpperCase()
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return part
          if (ROMAN_NUMERAL.test(part)) return part.toUpperCase()
          if (!isAllCaps && part.length <= 3 && /^\p{Lu}+$/u.test(part)) return part
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        })
        .join("-"),
    )
    .join(" ")
}

function MixedFontText({
  text,
  specialClassName,
}: {
  text: string
  specialClassName: string
}) {
  const parts = text.split(new RegExp(SPECIAL_SPLIT.source, "g"))
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null
        if (DASH_GLYPH.test(part)) {
          return (
            <span
              key={`${part}-${index}`}
              className="font-normal not-italic tracking-normal"
              style={{ fontFamily: '"SortsMillGoudy", Georgia, "Times New Roman", serif' }}
            >
              {part}
            </span>
          )
        }
        if (PLUS_GLYPH.test(part)) {
          return (
            <span
              key={`${part}-${index}`}
              className="relative -top-[0.08em] mx-[0.1em] inline-block font-normal not-italic tracking-normal"
              style={{
                fontFamily: '"SortsMillGoudy", Georgia, "Times New Roman", serif',
                fontSize: "0.95em",
              }}
              aria-label="of blessed memory"
            >
              †
            </span>
          )
        }
        if (SPECIAL_GLYPH.test(part)) {
          return (
            <span key={`${part}-${index}`} className={specialClassName}>
              {part}
            </span>
          )
        }
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      })}
    </>
  )
}

// "GERONGA – ATIENZA / NUPTIALS" — surnames are the last word of each full name
function NuptialsMark({ groom, bride }: { groom: string; bride: string }) {
  const surname = (name: string) => name.trim().split(/\s+/).pop() ?? ""
  return (
    <motion.div variants={revealItem} className="mb-6 text-center sm:mb-7 md:mb-8">
      <p
        className={`${cinzel.className} text-[1.15rem] font-bold uppercase leading-tight tracking-[0.12em] sm:text-[1.5rem] md:text-[1.85rem]`}
        style={{ color: NAVY }}
      >
        {surname(groom)} – {surname(bride)}
      </p>
      <p
        className={`${cinzel.className} mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.42em] sm:text-[0.7rem]`}
        style={{ color: BODY }}
      >
        Nuptials
      </p>
    </motion.div>
  )
}

function EntourageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <h2
      className="welcome-title-lockup relative mx-auto w-full max-w-full text-center"
      style={
        {
          "--title-size": "clamp(1.35rem, min(6.2vw, 8.5cqi), 3rem)",
          "--script-size": "clamp(0.78rem, min(3.2vw, 4.8cqi), 1.85rem)",
        } as React.CSSProperties
      }
    >
      <span className="sr-only">{title} — {subtitle}</span>
      <span
        aria-hidden
        className={`${theSeasons.className} block uppercase leading-[0.9] tracking-[0.04em] min-[400px]:tracking-[0.08em] sm:tracking-[0.12em] md:tracking-[0.14em]`}
        style={{
          fontSize: "var(--title-size)",
          color: NAVY,
        }}
      >
        {title}
      </span>
      <span
        aria-hidden
        className={`${aboveTheBeyond.className} relative z-10 mx-auto mt-1.5 block w-fit max-w-full px-1 leading-[0.88] sm:mt-2 sm:leading-[0.9]`}
        style={{
          fontSize: "var(--script-size)",
          color: SCRIPT,
          textShadow: "0 1px 0 var(--color-motif-soft)",
        }}
      >
        {subtitle}
      </span>
    </h2>
  )
}

interface EntourageMember {
  name: string
  roleCategory: string
  roleTitle: string
  email: string
}

interface PrincipalSponsor {
  malePrincipalSponsor: string
  femalePrincipalSponsor: string
}

/** Accepts PascalCase from API / Sheets or camelCase */
function entourageMemberFromApi(row: Record<string, unknown>): EntourageMember {
  const r = row as Record<string, string | undefined>
  return {
    name: r.name ?? r.Name ?? "",
    roleCategory: r.roleCategory ?? r.RoleCategory ?? "",
    roleTitle: r.roleTitle ?? r.RoleTitle ?? "",
    email: r.email ?? r.Email ?? "",
  }
}

function firstSheetText(row: Record<string, string | undefined>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]?.trim()
    if (value) return value
  }
  return ""
}

function principalSponsorFromApi(row: Record<string, unknown>): PrincipalSponsor {
  const r = row as Record<string, string | undefined>
  return {
    malePrincipalSponsor: firstSheetText(r, [
      "malePrincipalSponsor",
      "MalePrincipalSponsor",
      "Male",
      "Ninong",
      "ninong",
    ]),
    femalePrincipalSponsor: firstSheetText(r, [
      "femalePrincipalSponsor",
      "FemalePrincipalSponsor",
      "Female",
      "Ninang",
      "ninang",
    ]),
  }
}

const ct = {
  label: sectionType.label,
  sectionTitle: `${sectionType.label} lg:text-base`,
  body: sectionType.text,
  bodyLg: sectionType.subheader,
} as const

const SECONDARY_SPONSOR_CATEGORIES = ["Candle Sponsors", "Veil Sponsors", "Cord Sponsors", "Ribbon Sponsors"]

// Categories with a fixed place in the sequence; anything else from the sheet
// is shown after the bridal party, before the Little Ones
const KNOWN_CATEGORIES = new Set([
  "OFFICIATING MINISTER",
  "Parents of the Groom",
  "Parents of the Bride",
  "Peer Sponsors",
  "Man of Honor",
  "Best Man",
  "Maid of Honor",
  "Matron of Honor",
  "Bride's Banner Bearer",
  "Family of the Groom",
  "Family of the Bride",
  "Groomsmen",
  "Bridesmaids",
  ...SECONDARY_SPONSOR_CATEGORIES,
  "Little Groom",
  "Little Bride",
  "Ring Bearer",
  "Bible Bearer",
  "Coin Bearer",
  "Flower Ladies",
])

const SINGLE_COLUMN_SECTIONS = new Set([
  "Bride's Banner Bearer",
  "Best Man",
  "Maid of Honor",
  "Ring Bearer",
  "Coin Bearer",
  "Bible Bearer",
  "Flower Girls",
  "Presider",
])

const ROLE_CATEGORY_DISPLAY_TITLES: Record<string, string> = {
  "Candle Sponsors": "To light our path",
  "Candle Sponsor": "To light our path",
  "Veil Sponsors": "To Cloth us as one",
  "Veil Sponsor": "To Cloth us as one",
  Veil: "To Cloth us as one",
  "Cord Sponsors": "To bind us together",
  "Cord Sponsor": "To bind us together",
  "Chord Sponsors": "To bind us together",
  "Chord Sponsor": "To bind us together",
  Chord: "To bind us together",
  Cord: "To bind us together",
}

function displayRoleCategory(category: string) {
  return ROLE_CATEGORY_DISPLAY_TITLES[category] ?? category
}

function normalizeRoleCategory(category: string): string {
  const normalized = category.trim()
  if (normalized.toLowerCase() === "officiating minister") {
    return "OFFICIATING MINISTER"
  }
  const honorAliases: Record<string, string> = {
    "man of honor": "Man of Honor",
    "best man": "Best Man",
    "maid of honor": "Maid of Honor",
    "matron of honor": "Matron of Honor",
  }
  const alias = honorAliases[normalized.toLowerCase()]
  if (alias) return alias
  if (normalized.toLowerCase().includes("banner")) {
    return "Bride's Banner Bearer"
  }
  for (const bearer of ["Ring Bearer", "Bible Bearer", "Coin Bearer"]) {
    if (normalized.toLowerCase().startsWith(bearer.toLowerCase())) return bearer
  }
  if (normalized.toLowerCase() === "peer sponsors") {
    return "Peer Sponsors"
  }
  if (
    normalized.toLowerCase() === "flower ladies" ||
    normalized.toLowerCase() === "flower girls"
  ) {
    return "Flower Ladies"
  }
  return normalized
}

function isCoupleMember(member: EntourageMember): boolean {
  return normalizeRoleCategory(member.roleCategory) === "The Couple"
}

// Father above mother on both sides
function sortParents(members: EntourageMember[]): EntourageMember[] {
  return [...members].sort((a, b) => {
    const aIsFather = a.roleTitle?.toLowerCase().includes("father") ?? false
    const bIsFather = b.roleTitle?.toLowerCase().includes("father") ?? false
    if (aIsFather && !bIsFather) return -1
    if (!aIsFather && bIsFather) return 1
    return 0
  })
}

function toEntourageMembers(data: Record<string, unknown>[]): EntourageMember[] {
  return data
    .map((row) => entourageMemberFromApi(row))
    .filter((member) => member.name.trim())
    .filter((member) => !isCoupleMember(member))
}

function toPrincipalSponsors(data: Record<string, unknown>[]): PrincipalSponsor[] {
  return data
    .map((row) => principalSponsorFromApi(row))
    .filter((sponsor) => sponsor.malePrincipalSponsor.trim() || sponsor.femalePrincipalSponsor.trim())
}

async function loadEntourageFromApi(signal?: AbortSignal, reload = false): Promise<EntourageMember[]> {
  const data = await fetchInvitationList<Record<string, unknown>>("/api/entourage", { signal, reload })
  return toEntourageMembers(data)
}

async function loadSponsorsFromApi(signal?: AbortSignal, reload = false): Promise<PrincipalSponsor[]> {
  // Sponsors are optional — never block the entourage on them
  try {
    const data = await fetchInvitationList<Record<string, unknown>>("/api/principal-sponsor", { signal, reload })
    return toPrincipalSponsors(data)
  } catch (error) {
    if (isAbortError(error)) throw error
    console.warn("Failed to load principal sponsors:", error)
    return []
  }
}

function readCachedParty() {
  const members = readCachedInvitationList<Record<string, unknown>>("/api/entourage")
  const sponsors = readCachedInvitationList<Record<string, unknown>>("/api/principal-sponsor")
  return {
    members: members ? toEntourageMembers(members) : [],
    sponsors: sponsors ? toPrincipalSponsors(sponsors) : [],
  }
}

export function Entourage() {
  const siteConfig = useSiteConfig()
  const content = siteConfig.entourage
  const { decos } = content
  const groomName = siteConfig.couple.groom
  const brideName = siteConfig.couple.bride
  const [entourage, setEntourage] = useState<EntourageMember[]>([])
  const [sponsors, setSponsors] = useState<PrincipalSponsor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardBodyRef = useRef<HTMLDivElement>(null)
  useSharedFit(cardBodyRef, [entourage, sponsors, isLoading, error])
  const reduceMotion = useReducedMotion()
  // Corner sprigs drift against the scroll for a little depth
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] })
  const decoTopY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-40, 70])
  const decoBottomY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [60, -40])

  const loadParty = async (signal?: AbortSignal, { reload = false } = {}) => {
    const cached = readCachedParty()
    const hasCached = cached.members.length > 0
    if (hasCached) {
      // Show the last known list right away; refresh quietly in the background
      setEntourage(cached.members)
      setSponsors(cached.sponsors)
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setIsRetrying(false)

    try {
      const [members, sponsorList] = await Promise.all([
        fetchUntilReady({
          signal,
          load: (s) => loadEntourageFromApi(s, reload),
          isReady: (list) => list.length > 0,
          maxAttempts: 4,
          maxDelayMs: 3000,
          onRetry: () => setIsRetrying(true),
        }),
        loadSponsorsFromApi(signal, reload),
      ])
      if (signal?.aborted) return
      setEntourage(members)
      setSponsors(sponsorList)
      setError(null)
    } catch (err: unknown) {
      if (isAbortError(err)) return
      console.error("Failed to load entourage:", err)
      if (!hasCached) setError("Unable to load entourage")
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
        setIsRetrying(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadParty(controller.signal)

    let updateTimer: ReturnType<typeof setTimeout> | undefined
    const handleEntourageUpdate = () => {
      clearTimeout(updateTimer)
      updateTimer = setTimeout(() => {
        void loadParty(controller.signal, { reload: true })
      }, 1000)
    }

    window.addEventListener("entourageUpdated", handleEntourageUpdate)

    return () => {
      controller.abort()
      clearTimeout(updateTimer)
      window.removeEventListener("entourageUpdated", handleEntourageUpdate)
    }
  }, [])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  // Group entourage by role category
  const grouped = useMemo(() => {
    const grouped: Record<string, EntourageMember[]> = {}
    
    entourage.forEach((member) => {
      const category = normalizeRoleCategory(member.roleCategory)

      if (!category || category === "Other") {
        return
      }
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(member)
    })
    
    return grouped
  }, [entourage])

  // Helper component for elegant section titles (category labels)
  const SectionTitle = ({
    children,
    align = "center",
    className = "",
    size = "single",
  }: {
    children: React.ReactNode
    align?: "left" | "center" | "right"
    className?: string
    size?: keyof typeof SECTION_TITLE_SIZE
  }) => {
    const textAlign =
      align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center"
    return (
      <motion.h3
        variants={revealItem}
        data-fit={size === "pair" ? "pair-title" : undefined}
        className={`relative ${SECTION_TITLE_CLASS} ${SECTION_TITLE_SIZE[size]} mb-1 sm:mb-2 md:mb-2.5 ${textAlign} ${className}`}
        style={{ color: NAVY }}
      >
        {typeof children === "string" ? (
          <MixedFontText
            text={content.headingLabels[children] ?? children}
            specialClassName="font-goudy-italic normal-case tracking-normal"
          />
        ) : (
          children
        )}
      </motion.h3>
    )
  }

  const NameItem = ({
    member,
    align = "center",
    showRole = true,
    featured = false,
  }: {
    member: EntourageMember
    align?: "left" | "center" | "right"
    showRole?: boolean
    featured?: boolean
  }) => {
    const containerAlign =
      align === "right" ? "items-end" : align === "left" ? "items-start" : "items-center"
    const textAlign =
      align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center"
    const displayName = toDisplayName(member.name)
    const displayRole = member.roleTitle ? toDisplayName(member.roleTitle) : ""
    return (
      <div
        className={`relative flex flex-col ${containerAlign} justify-center py-1 sm:py-1.5 min-w-0 w-full max-w-full group/item transition-all duration-300`}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-md"
          style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-motif-silver) 70%, transparent), transparent)" }}
        />
        <p
          data-fit="name"
          className={`${theSeasons.className} relative ${textAlign} max-w-full overflow-hidden whitespace-nowrap`}
          style={{ ...(featured ? coupleNameStyle : nameStyle), color: NAVY }}
          title={displayName.replace(/\+/g, "†")}
        >
          {displayName ? (
            <MixedFontText
              text={displayName}
              specialClassName="font-goudy-italic tracking-normal"
            />
          ) : null}
        </p>
        {featured && (
          <span
            className="relative mt-2 block h-px w-10 sm:w-14"
            style={{ background: "linear-gradient(to right, transparent, var(--color-motif-accent), transparent)" }}
            aria-hidden
          />
        )}
        {showRole && displayRole && (
          <p
            className={`${theSeasons.className} relative mt-0.5 ${textAlign} max-w-full break-words`}
            style={{ ...roleTitleStyle, color: SCRIPT }}
            title={displayRole}
          >
            <MixedFontText
              text={displayRole}
              specialClassName="font-goudy-italic tracking-normal"
            />
          </p>
        )}
      </div>
    )
  }

  const TwoColumnLayout = ({
    children,
    leftTitle,
    rightTitle,
    singleTitle,
    centerContent = false,
    centerColumns = false,
    spine = false,
  }: {
    children: React.ReactNode
    leftTitle?: string
    rightTitle?: string
    singleTitle?: string
    centerContent?: boolean
    centerColumns?: boolean
    // Faint vertical line between the two columns
    spine?: boolean
  }) => {
    const spineLine = spine ? <ColumnSpine /> : null
    if (singleTitle) {
      return (
        <div className="mb-5 sm:mb-6 md:mb-7">
          <SectionTitle>{singleTitle}</SectionTitle>
          <div
            className={`relative grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-0.5 sm:gap-y-1 ${centerContent ? "max-w-3xl mx-auto" : ""}`}
          >
            {spineLine}
            {children}
          </div>
        </div>
      )
    }

    return (
      <div className="mb-5 sm:mb-6 md:mb-7">
        <div className="grid grid-cols-2 items-end gap-x-3 sm:gap-x-4 md:gap-x-6 mb-1 sm:mb-2 md:mb-2.5">
          {leftTitle && (
            <SectionTitle align={centerColumns ? "center" : "right"} size="pair" className="pr-0.5 sm:pr-1">
              {leftTitle}
            </SectionTitle>
          )}
          {rightTitle && (
            <SectionTitle align={centerColumns ? "center" : "left"} size="pair" className="pl-0.5 sm:pl-1">
              {rightTitle}
            </SectionTitle>
          )}
        </div>
        <div
          className={`relative grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-0.5 sm:gap-y-1 ${centerContent ? "max-w-3xl mx-auto" : ""}`}
        >
          {spineLine}
          {children}
        </div>
      </div>
    )
  }

  const g = (category: string) => grouped[category] ?? []

  const Cell = ({ children }: { children?: React.ReactNode }) => (
    <motion.div variants={revealItem} className="px-0.5 sm:px-1 md:px-1.5 min-w-0 overflow-hidden">
      {children ?? <div className="py-0.5" />}
    </motion.div>
  )

  // Row-by-row pairs; "inward" puts the two names meeting at the center line
  const pairRows = (
    left: EntourageMember[],
    right: EntourageMember[],
    keyPrefix: string,
    { inward = true, showRole = true }: { inward?: boolean; showRole?: boolean } = {},
  ) =>
    Array.from({ length: Math.max(left.length, right.length) }, (_, i) => (
      <React.Fragment key={`${keyPrefix}-row-${i}`}>
        <Cell>{left[i]?.name && <NameItem member={left[i]} align={inward ? "right" : "center"} showRole={showRole} />}</Cell>
        <Cell>{right[i]?.name && <NameItem member={right[i]} align={inward ? "left" : "center"} showRole={showRole} />}</Cell>
      </React.Fragment>
    ))

  const centeredNames = (members: EntourageMember[], keyPrefix: string, showRole = true) => (
    <div className="col-span-full flex flex-col items-center gap-0.5 sm:gap-1">
      {members.map((member, idx) => (
        <motion.div key={`${keyPrefix}-${idx}-${member.name}`} variants={revealItem} className="w-full">
          <NameItem member={member} align="center" showRole={showRole} />
        </motion.div>
      ))}
    </div>
  )

  // Short lists stay centered; longer ones split down the middle into two columns
  const listBody = (category: string, members: EntourageMember[], showRole = true) => {
    if (SINGLE_COLUMN_SECTIONS.has(category) || members.length <= 2) {
      return centeredNames(members, category, showRole)
    }
    const half = Math.ceil(members.length / 2)
    return pairRows(members.slice(0, half), members.slice(half), category, { showRole })
  }

  const renderList = (category: string, title = category, showRole = true) => {
    const members = g(category)
    if (members.length === 0) return null
    return (
      <TwoColumnLayout singleTitle={displayRoleCategory(title)} centerContent>
        {listBody(category, members, showRole)}
      </TwoColumnLayout>
    )
  }

  // Groom's side on the left, bride's side on the right; one side alone is centered
  const renderSides = (
    leftCategory: string,
    rightCategory: string,
    { inward = true, showRole = true, sort = (m: EntourageMember[]) => m } = {},
  ) => {
    const left = sort(g(leftCategory))
    const right = sort(g(rightCategory))
    if (left.length === 0 && right.length === 0) return null
    if (left.length > 0 && right.length > 0) {
      return (
        <TwoColumnLayout leftTitle={leftCategory} rightTitle={rightCategory} centerColumns={!inward} spine={inward}>
          {pairRows(left, right, leftCategory, { inward, showRole })}
        </TwoColumnLayout>
      )
    }
    const only = left.length > 0 ? leftCategory : rightCategory
    return (
      <TwoColumnLayout singleTitle={only} centerContent>
        {centeredNames(left.length > 0 ? left : right, only, showRole)}
      </TwoColumnLayout>
    )
  }

  const asMember = (name: string): EntourageMember => ({ name, roleCategory: "", roleTitle: "", email: "" })

  // Same sequence as the printed entourage card:
  // Groom & Bride → (Parents) → Principal Sponsors → Best Man / Maid of Honor →
  // Bride's Banner Bearer → Little Ones (Ring Bearer, Flower Girl)
  const blocks: { key: string; node: React.ReactNode; divider?: boolean }[] = []
  const add = (key: string, node: React.ReactNode, divider = false) => {
    if (node) blocks.push({ key, node, divider })
  }

  add(
    "couple",
    <>
      <NuptialsMark groom={groomName} bride={brideName} />
      {/* Groom & Bride side by side, joined by a script ampersand */}
      <div className="relative mx-auto mb-5 grid max-w-2xl grid-cols-2 items-start gap-x-9 sm:mb-6 sm:gap-x-16 md:mb-7 md:gap-x-20">
        <SectionTitle size="pair">{content.groomRole}</SectionTitle>
        <SectionTitle size="pair">{content.brideRole}</SectionTitle>
        <Cell>
          <NameItem member={asMember(groomName)} align="center" showRole={false} featured />
        </Cell>
        <Cell>
          <NameItem member={asMember(brideName)} align="center" showRole={false} featured />
        </Cell>
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <motion.span
            variants={revealItem}
            className={`${aboveTheBeyond.className} block text-[1.6rem] leading-none sm:text-[2.1rem] md:text-[2.4rem]`}
            style={{ color: "color-mix(in srgb, var(--color-motif-accent) 85%, transparent)" }}
          >
            &amp;
          </motion.span>
        </span>
      </div>
    </>,
  )

  add("parents", renderSides("Parents of the Groom", "Parents of the Bride", { showRole: false, sort: sortParents }))
  add("officiating", renderList("OFFICIATING MINISTER", "OFFICIATING MINISTER", false))

  if (sponsors.length > 0) {
    add(
      "principal-sponsors",
      <TwoColumnLayout singleTitle="Principal Sponsors" centerContent spine>
        {pairRows(
          sponsors.map((s) => asMember(s.malePrincipalSponsor)),
          sponsors.map((s) => asMember(s.femalePrincipalSponsor)),
          "sponsor",
          { showRole: false },
        )}
      </TwoColumnLayout>,
    )
  }
  add("peer-sponsors", renderList("Peer Sponsors", "Peer Sponsors", false))

  const honorAttendants = [
    renderList("Man of Honor"),
    renderSides("Best Man", "Maid of Honor", { inward: false, showRole: false }),
    renderList("Matron of Honor", "Matron of Honor", false),
  ].filter(Boolean)
  if (honorAttendants.length > 0) {
    add("honor", <>{honorAttendants.map((node, i) => <React.Fragment key={i}>{node}</React.Fragment>)}</>)
  }

  add("banner", renderList("Bride's Banner Bearer"))
  add("family", renderSides("Family of the Groom", "Family of the Bride"))

  const groomsmen = g("Groomsmen")
  const bridesmaids = g("Bridesmaids")
  if (groomsmen.length > 0 || bridesmaids.length > 0) {
    add(
      "bridal-party",
      <TwoColumnLayout singleTitle="Beloved Entourage" spine>
        {pairRows(groomsmen, bridesmaids, "bridal")}
      </TwoColumnLayout>,
    )
  }

  const secondarySponsors = SECONDARY_SPONSOR_CATEGORIES.filter((c) => g(c).length > 0).map((category) => {
    const members = g(category)
    return (
      <TwoColumnLayout key={category} singleTitle={displayRoleCategory(category)} centerContent spine={members.length === 2}>
        {members.length === 2 ? pairRows([members[0]], [members[1]], category) : centeredNames(members, category)}
      </TwoColumnLayout>
    )
  })
  if (secondarySponsors.length > 0) {
    add(
      "secondary-sponsors",
      <>
        <SectionTitle className="mb-3 sm:mb-4">Secondary Sponsors</SectionTitle>
        {secondarySponsors}
      </>,
    )
  }

  // Any category from the sheet that isn't part of the fixed sequence
  Object.keys(grouped)
    .filter((category) => !KNOWN_CATEGORIES.has(category))
    .forEach((category) => add(`other-${category}`, renderList(category)))

  const flowerGirls = g("Flower Ladies")
  const littleOnes = [
    renderSides("Little Groom", "Little Bride"),
    renderList("Ring Bearer"),
    renderList("Bible Bearer"),
    renderList("Coin Bearer"),
    renderList("Flower Ladies", flowerGirls.length === 1 ? "Flower Girl" : "Flower Girls"),
  ].filter(Boolean)
  if (littleOnes.length > 0) {
    add(
      "little-ones",
      <>
        <SectionTitle className="mb-3 sm:mb-4">Little Ones</SectionTitle>
        {littleOnes.map((node, i) => <React.Fragment key={i}>{node}</React.Fragment>)}
      </>,
      true,
    )
  }

  return (
    <div
      ref={sectionRef}
      className={`${theSeasons.variable} ${aboveTheBeyond.variable} relative w-full`}
      style={{ background: sectionBg }}
    >
      <EntourageAmbience />
      <Section
        id="entourage"
        className="relative z-10 overflow-hidden pt-8 pb-8 sm:pt-10 sm:pb-10 md:pt-12 md:pb-12 lg:pt-14 lg:pb-14"
      >
        {/* Corner decorations (from site.ts) */}
        <motion.div className="pointer-events-none absolute left-0 top-0 z-10" style={{ y: decoTopY }}>
          <DecoImg src={decos.topLeft} className={CORNER_DECO_CLASS} />
        </motion.div>
        <motion.div className="pointer-events-none absolute right-0 top-0 z-10" style={{ y: decoTopY }}>
          <DecoImg src={decos.topRight} className={CORNER_DECO_CLASS} />
        </motion.div>
        <motion.div className="pointer-events-none absolute bottom-0 left-0 z-10" style={{ y: decoBottomY }}>
          <DecoImg src={decos.bottomLeft} className={CORNER_DECO_CLASS} />
        </motion.div>
        <motion.div className="pointer-events-none absolute bottom-0 right-0 z-10" style={{ y: decoBottomY }}>
          <DecoImg src={decos.bottomRight} className={CORNER_DECO_CLASS} />
        </motion.div>

      <div className={`relative z-20 mx-auto mb-8 max-w-5xl px-3 text-center @container/entourage sm:mb-10 sm:px-4 md:mb-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}>
        <DecoImg
          src={decos.headerOrnament}
          className="mx-auto mb-3 block h-auto w-28 select-none sm:mb-4 sm:w-36 md:w-44"
        />
        <div className="mx-auto mb-4 sm:mb-5 md:mb-6">
          <OutsideDivider />
        </div>
        <p
          className={`${cinzel.className} mx-auto max-w-[20rem] px-2 text-[0.625rem] font-semibold leading-snug tracking-[0.12em] min-[400px]:max-w-none min-[400px]:text-[0.6875rem] min-[400px]:tracking-[0.16em] sm:text-[0.8125rem] sm:tracking-[0.2em] md:text-sm md:tracking-[0.22em]`}
          style={{ color: ACCENT }}
        >
          {content.eyebrow}
        </p>
        <div className="mx-auto mt-3 sm:mt-4 md:mt-5">
          <EntourageTitle title={content.title} subtitle={content.subtitle} />
        </div>

        <p
          className="font-goudy-italic mx-auto mt-4 max-w-xl px-2 text-sm leading-relaxed sm:mt-5 sm:text-base md:mt-6"
          style={{ color: BODY }}
        >
          {content.description}
        </p>

        <div className="mt-4 flex items-center justify-center sm:mt-5">
          <span
            className="h-px w-16 sm:w-24 md:w-32"
            style={dividerLineStyle}
          />
        </div>
      </div>

      <div
        className={`relative z-20 mx-auto max-w-3xl px-0 pb-2 sm:max-w-4xl sm:px-6 md:px-8 @container/entourage-card transition-all duration-1000 delay-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="relative">
          <div
            className="relative z-20 overflow-hidden rounded-[1.75rem] backdrop-blur-[3px] sm:rounded-[2.25rem]"
            style={cardStyle}
          >
            <div
              className="pointer-events-none absolute inset-2.5 z-30 rounded-[1.35rem] sm:inset-4 sm:rounded-[1.75rem] md:inset-5"
              style={{ border: `1px solid ${HAIRLINE}` }}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute left-1/2 top-2.5 z-30 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 sm:top-4 md:top-5"
              style={{ background: ACCENT }}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-2.5 left-1/2 z-30 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 sm:bottom-4 md:bottom-5"
              style={{ background: ACCENT }}
              aria-hidden
            />
            {/* One slow sheen across the paper when the card comes into view */}
            {!reduceMotion && (
              <motion.span
                className="pointer-events-none absolute inset-y-0 z-30 w-1/3 -skew-x-12"
                style={{ background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 45%), transparent)" }}
                initial={{ left: "-40%" }}
                whileInView={{ left: "120%" }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 2.4, ease: "easeInOut", delay: 0.6 }}
                aria-hidden
              />
            )}

            <div
              ref={cardBodyRef}
              className="relative z-20 px-4 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12 md:px-12 md:pb-16 md:pt-14 lg:px-14"
            >
            {isLoading ? (
              <div className="flex items-center justify-center py-24 sm:py-28 md:py-32">
                <div className="text-center">
                  <p className={`font-goudy-italic ${ct.body}`} style={{ color: palette.body }}>
                    {isRetrying ? content.retryingText : content.loadingText}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-24 sm:py-28 md:py-32">
                <div className="text-center">
                  <p className={`font-goudy-italic ${ct.bodyLg} mb-3`} style={{ color: palette.body }}>
                    {content.errorText}
                  </p>
                  <button
                    onClick={() => void loadParty(undefined, { reload: true })}
                    className={`${cinzel.className} ${ct.body} underline transition-colors duration-200 hover:opacity-80`}
                    style={{ color: palette.accent }}
                  >
                    {content.retryText}
                  </button>
                </div>
              </div>
            ) : (
            <>
              {blocks.map(({ key, node, divider }, i) => (
                <React.Fragment key={key}>
                  {(i === 1 || divider) && <Flourish />}
                  <Reveal>{node}</Reveal>
                </React.Fragment>
              ))}
            </>
            )}
          </div>
        </div>
        </div>
        <DecoImg
          src={decos.footerVine}
          className="relative z-20 mx-auto mt-10 block h-auto w-56 select-none opacity-90 sm:mt-12 sm:w-72 md:w-96"
        />
      </div>
      </Section>
    </div>
  )
}