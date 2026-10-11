"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Cinzel } from "next/font/google"
import { motion, useReducedMotion } from "motion/react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const IVORY = "var(--color-motif-soft)"
const ACCENT = "var(--color-motif-accent)"
const BORDER = "color-mix(in srgb, var(--color-motif-accent) 30%, transparent)"
const BUTTON_BG = "var(--color-welcome-green)"
const revealEase = [0.22, 1, 0.36, 1] as const

const FILTERS = [
  { id: "all", label: "All" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
] as const
type FilterId = (typeof FILTERS)[number]["id"]

const MAX_IMAGE_RETRIES = 5
const DISPLAY_RETRY_MS = 6000
const LAZY_ROOT_MARGIN = "480px 0px"

type ImageItem = {
  src: string
  category: "desktop" | "mobile" | "front" | "gallery"
  width: number
  height: number
  orientation: "portrait" | "landscape"
}

function cacheBustSrc(src: string, attempt: number) {
  if (attempt <= 0) return src
  const joiner = src.includes("?") ? "&" : "?"
  return `${src}${joiner}retry=${attempt}`
}

function RetryableGalleryImage({
  src,
  width,
  height,
  alt,
  sizes,
  className,
  style,
  priority = false,
  variant = "grid",
}: {
  src: string
  width: number
  height: number
  alt: string
  sizes: string
  className?: string
  style?: React.CSSProperties
  priority?: boolean
  variant?: "grid" | "lightbox"
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const loadedRef = useRef(false)
  const [inView, setInView] = useState(priority)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const isLightbox = variant === "lightbox"

  const retry = useCallback(() => {
    if (loadedRef.current) return
    setAttempt((current) => (current >= MAX_IMAGE_RETRIES ? current : current + 1))
  }, [])

  useEffect(() => {
    if (inView) return
    const el = wrapRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      { rootMargin: LAZY_ROOT_MARGIN },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  useEffect(() => {
    if (!inView || loaded) return

    const timeoutId = window.setTimeout(() => {
      if (!loadedRef.current) retry()
    }, DISPLAY_RETRY_MS + attempt * 400)

    return () => window.clearTimeout(timeoutId)
  }, [attempt, inView, loaded, retry])

  return (
    <div
      ref={wrapRef}
      className={isLightbox ? "relative flex max-h-[85vh] w-full items-center justify-center" : "relative w-full overflow-hidden"}
      style={
        isLightbox
          ? undefined
          : {
              aspectRatio: `${width} / ${height}`,
              backgroundColor: "color-mix(in srgb, var(--color-motif-medium) 18%, var(--color-motif-soft))",
            }
      }
    >
      {inView ? (
        <Image
          key={`${src}-${attempt}`}
          src={cacheBustSrc(src, attempt)}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          unoptimized
          priority={priority}
          loading="eager"
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${
            isLightbox
              ? "h-auto max-h-[85vh] w-auto max-w-full shadow-2xl"
              : "absolute inset-0 h-full w-full"
          }`}
          style={style}
          onLoad={() => {
            loadedRef.current = true
            setLoaded(true)
          }}
          onError={() => {
            window.setTimeout(retry, 180)
          }}
        />
      ) : null}
    </div>
  )
}

export default function MasonryGallery({ images: allImages }: { images: ImageItem[] }) {
  const reduceMotion = useReducedMotion()
  const [filter, setFilter] = useState<FilterId>("all")
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const images = useMemo(
    () => (filter === "all" ? allImages : allImages.filter((img) => img.orientation === filter)),
    [allImages, filter],
  )
  const counts = useMemo(
    () => ({
      all: allImages.length,
      landscape: allImages.filter((img) => img.orientation === "landscape").length,
      portrait: allImages.filter((img) => img.orientation === "portrait").length,
    }),
    [allImages],
  )

  const step = useCallback(
    (dir: 1 | -1) =>
      setLightboxIdx((idx) => (idx == null ? null : (idx + dir + images.length) % images.length)),
    [images.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIdx == null) return
      if (e.key === "Escape") setLightboxIdx(null)
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxIdx, step])

  useEffect(() => {
    if (lightboxIdx == null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [lightboxIdx])

  useEffect(() => {
    if (lightboxIdx == null) return
    const neighbors = [
      images[(lightboxIdx + 1) % images.length],
      images[(lightboxIdx - 1 + images.length) % images.length],
    ]
    neighbors.forEach((image) => {
      if (!image) return
      const preload = new window.Image()
      preload.decoding = "async"
      preload.src = image.src
    })
  }, [images, lightboxIdx])

  const navButtonClass =
    "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-black/60 sm:h-12 sm:w-12"

  return (
    <div ref={topRef} className="relative">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-full border p-1"
          style={{ borderColor: BORDER, background: "color-mix(in srgb, var(--color-motif-soft) 80%, transparent)" }}
          role="tablist"
          aria-label="Filter photos"
        >
          {FILTERS.map(({ id, label }) => {
            const active = filter === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(id)}
                className={`${cinzel.className} rounded-full px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 sm:px-4 sm:text-[0.6875rem]`}
                style={{
                  background: active ? BUTTON_BG : "transparent",
                  color: active ? IVORY : ACCENT,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div
          className={`${cinzel.className} text-[0.6875rem] font-semibold uppercase tracking-[0.18em] sm:text-xs`}
          style={{ color: ACCENT }}
        >
          {counts[filter]} photos
        </div>
      </div>

      {images.length === 0 ? (
        <div className="font-goudy-italic text-center" style={{ color: "var(--color-welcome-text)" }}>
          No images to display.
        </div>
      ) : (
        <div key={filter} className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
          {images.map((img, idx) => (
            <motion.button
              key={img.src}
              type="button"
              className="group mb-3 block w-full break-inside-avoid text-left sm:mb-4"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -40px 0px" }}
              transition={{ duration: 0.7, ease: revealEase }}
              onClick={() => setLightboxIdx(idx)}
              aria-label={`Open photo ${idx + 1}`}
            >
              <div
                className="relative w-full overflow-hidden rounded-xl border p-1 shadow-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl"
                style={{ borderColor: BORDER, backgroundColor: IVORY }}
              >
                <div className="overflow-hidden rounded-lg">
                  <RetryableGalleryImage
                    src={img.src}
                    alt=""
                    width={img.width}
                    height={img.height}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="rounded-lg object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ imageOrientation: "from-image" }}
                    priority={idx < 4}
                  />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {lightboxIdx != null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 backdrop-blur-sm sm:p-6"
          style={{ background: "color-mix(in srgb, var(--color-welcome-navy) 35%, black 65%)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightboxIdx(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current == null) return
            const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
            touchStartX.current = null
            if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1)
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 sm:p-6">
            <span
              className="rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-md"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-motif-deep) 55%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-motif-silver) 50%, transparent)",
                color: IVORY,
              }}
            >
              {lightboxIdx + 1} / {images.length}
            </span>
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/20 bg-black/40 p-2.5 text-white backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIdx(null)
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className={`${navButtonClass} left-2 sm:left-5`}
                onClick={(e) => {
                  e.stopPropagation()
                  step(-1)
                }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className={`${navButtonClass} right-2 sm:right-5`}
                onClick={(e) => {
                  e.stopPropagation()
                  step(1)
                }}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative flex w-full max-w-6xl items-center justify-center px-10 sm:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <RetryableGalleryImage
              key={images[lightboxIdx].src}
              src={images[lightboxIdx].src}
              alt=""
              width={images[lightboxIdx].width}
              height={images[lightboxIdx].height}
              sizes="100vw"
              className="rounded-lg object-contain"
              style={{ imageOrientation: "from-image" }}
              priority
              variant="lightbox"
            />
          </div>

          {images.length > 1 && (
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm sm:hidden">
              Swipe to navigate
            </p>
          )}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          className={`${cinzel.className} rounded-full border px-6 py-3 text-[0.625rem] font-semibold uppercase tracking-[0.18em] shadow-lg transition-all duration-200 hover:scale-105 sm:text-[0.6875rem] sm:tracking-[0.2em]`}
          style={{ background: BUTTON_BG, borderColor: BORDER, color: IVORY }}
          onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          Back to top
        </button>
      </div>
    </div>
  )
}
