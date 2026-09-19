"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Reveal children on scroll with an optional stagger delay. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: "div" | "li" | "span" | "figure"
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const Component = Tag as any
  return (
    <Component
      ref={ref as any}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  )
}

/** Count up to a numeric value once it scrolls into view. */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1600,
  className,
}: {
  to: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(eased * to))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  )
}

/** Rotating diamond-core bore reticle — the signature engineering motif. */
export function BoreReticle({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none relative", className)} aria-hidden="true">
      <div className="absolute inset-0 animate-ring-pulse rounded-full border border-primary/40" />
      <svg viewBox="0 0 200 200" className="size-full">
        <g className="origin-center animate-spin-slow" style={{ transformBox: "fill-box" }}>
          <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="6 10" />
        </g>
        <g className="origin-center animate-spin-rev" style={{ transformBox: "fill-box" }}>
          <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="18"
              x2="100"
              y2="30"
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              transform={`rotate(${i * 15} 100 100)`}
            />
          ))}
        </g>
        <circle cx="100" cy="100" r="48" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        <circle cx="100" cy="100" r="5" fill="var(--primary)" />
      </svg>
    </div>
  )
}

/** Infinite marquee ticker. */
export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items]
  return (
    <div className="group relative flex overflow-hidden">
      <div className="flex shrink-0 animate-marquee items-center">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 text-2xl font-black tracking-tight sm:text-3xl">
            {item}
            <span className="text-primary">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}
