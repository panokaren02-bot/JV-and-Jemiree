import MasonryGallery from "@/components/masonry-gallery"
import { fetchGalleryImages } from "@/lib/fetch-gallery-images"
import { layeredSectionTitleSize, sectionType } from "@/lib/section-typography"
import { sectionBackground } from "@/lib/section-background"
import { siteConfig } from "@/content/site"
import "@/components/loader/loading-screen.css"
import localFont from "next/font/local"
import { Cinzel } from "next/font/google"
import { Camera } from "lucide-react"

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

const ACCENT = "var(--color-motif-accent)"
const NAVY = "var(--color-welcome-navy)"
const SCRIPT = "var(--color-welcome-script)"
const BODY = "var(--color-welcome-text)"

const accentDividerStyle = {
  background: "linear-gradient(to right, transparent, var(--color-motif-accent), transparent)",
} as const

const accentDividerStyleLeft = {
  background: "linear-gradient(to left, transparent, var(--color-motif-accent), transparent)",
} as const

const CORNER_DECO_CLASS =
  "block h-auto w-auto max-w-[120px] sm:max-w-[180px] md:max-w-[240px] lg:max-w-[300px] select-none"

const CORNERS = [
  { key: "topLeft", place: "left-0 top-0", anim: "invite-section-corner-img--tl" },
  { key: "topRight", place: "right-0 top-0", anim: "invite-section-corner-img--tr" },
  { key: "bottomLeft", place: "left-0 bottom-0", anim: "invite-section-corner-img--bl" },
  { key: "bottomRight", place: "right-0 bottom-0", anim: "invite-section-corner-img--br" },
] as const

type GalleryPhoto = {
  src: string
  width: number
  height: number
  category: "desktop" | "mobile"
  orientation: "portrait" | "landscape"
}

/** Spread portraits evenly through the landscapes so the masonry columns stay mixed. */
function interleave(a: GalleryPhoto[], b: GalleryPhoto[]): GalleryPhoto[] {
  if (!a.length || !b.length) return [...a, ...b]
  const [long, short] = a.length >= b.length ? [a, b] : [b, a]
  const out: GalleryPhoto[] = []
  const step = long.length / short.length
  let next = 0
  long.forEach((photo, i) => {
    out.push(photo)
    while (next < short.length && (next + 1) * step <= i + 1) out.push(short[next++])
  })
  return out.concat(short.slice(next))
}

export const dynamic = "force-static"

function OutsideDivider() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="h-px w-6 sm:w-10" style={accentDividerStyle} />
      <span className="h-0.5 w-0.5 rounded-full sm:h-1 sm:w-1" style={{ background: ACCENT }} aria-hidden />
      <span className="h-px w-6 sm:w-10" style={accentDividerStyleLeft} />
    </div>
  )
}

function GalleryTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <h1
      className="welcome-title-lockup relative mx-auto w-full max-w-full text-center"
      style={
        {
          "--title-size": layeredSectionTitleSize.main,
          "--script-size": layeredSectionTitleSize.script,
        } as React.CSSProperties
      }
    >
      <span className="sr-only">{title}, {subtitle}</span>
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
          textShadow:
            "0 1px 0 color-mix(in srgb, var(--color-welcome-bg) 95%, white), 0 0 10px color-mix(in srgb, var(--color-welcome-bg) 65%, white)",
        }}
      >
        {subtitle}
      </span>
    </h1>
  )
}

export default async function GalleryPage() {
  const { gallery } = siteConfig
  const { desktop, mobile } = await fetchGalleryImages()
  const withMeta = (category: GalleryPhoto["category"]) => (image: Omit<GalleryPhoto, "category" | "orientation">) => ({
    ...image,
    category,
    orientation: (image.width >= image.height ? "landscape" : "portrait") as GalleryPhoto["orientation"],
  })
  const images = interleave(desktop.map(withMeta("desktop")), mobile.map(withMeta("mobile")))

  return (
    <main
      className={`${theSeasons.variable} ${aboveTheBeyond.variable} relative min-h-screen overflow-x-hidden`}
      style={{ background: sectionBackground }}
    >
      {CORNERS.map(({ key, place, anim }) =>
        gallery.decos[key] ? (
          <div key={key} className={`pointer-events-none absolute z-10 ${place}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery.decos[key]}
              alt=""
              aria-hidden="true"
              className={`${CORNER_DECO_CLASS} invite-section-corner-img--animated ${anim}`}
            />
          </div>
        ) : null,
      )}

      <section className="relative z-20 mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="relative z-20 mb-8 px-3 text-center sm:mb-10 sm:px-4 md:mb-12">
          {gallery.decos.headerOrnament ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gallery.decos.headerOrnament}
              alt=""
              aria-hidden="true"
              className="mx-auto mb-3 block h-auto w-28 select-none sm:mb-4 sm:w-36 md:w-44"
            />
          ) : null}
          <OutsideDivider />
          <p
            className={`${cinzel.className} mx-auto mt-4 max-w-[20rem] px-2 text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.12em] min-[400px]:max-w-none min-[400px]:text-[0.75rem] min-[400px]:tracking-[0.16em] sm:mt-6 sm:text-[0.9375rem] sm:tracking-[0.2em] md:text-base md:tracking-[0.22em]`}
            style={{ color: ACCENT }}
          >
            {gallery.eyebrow}
          </p>
          <div className="mx-auto mt-3 sm:mt-4 md:mt-5">
            <GalleryTitle title={gallery.title} subtitle={gallery.subtitle} />
          </div>
          <p
            className={`font-goudy-italic mx-auto mt-4 max-w-xl px-2 sm:mt-5 md:mt-6 ${sectionType.textRelaxed}`}
            style={{ color: BODY }}
          >
            {gallery.description}
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 sm:mt-5">
            <span className="h-px w-8 sm:w-12 md:w-16" style={accentDividerStyle} />
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: ACCENT }} aria-hidden />
            <span className="h-px w-8 sm:w-12 md:w-16" style={accentDividerStyleLeft} />
          </div>
        </div>

        {images.length > 0 ? (
          <MasonryGallery images={images} />
        ) : (
          <p className={`text-center font-goudy-italic ${sectionType.text}`} style={{ color: BODY }}>
            No images to display.
          </p>
        )}

        {gallery.decos.footerVine ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gallery.decos.footerVine}
            alt=""
            aria-hidden="true"
            className="relative z-20 mx-auto mt-10 block h-auto w-56 select-none opacity-90 sm:w-72 md:w-96"
          />
        ) : null}
      </section>
    </main>
  )
}
