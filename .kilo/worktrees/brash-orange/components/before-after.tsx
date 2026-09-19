"use client"

import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import { MoveHorizontal } from "lucide-react"

export function BeforeAfterSlider() {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)

  const update = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, p)))
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full cursor-ew-resize touch-none overflow-hidden rounded-2xl border border-border select-none"
      onPointerDown={(e) => {
        dragging.current = true
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && update(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      role="slider"
      aria-label="Сравнение до и после бурения"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4))
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4))
      }}
    >
      <Image src="/images/work-finished-hole.png" alt="Аккуратное отверстие после алмазного бурения" fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
      <span className="absolute right-4 top-4 rounded-md bg-primary px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground">После</span>

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src="/images/before-wall.png" alt="Стена до алмазного бурения" fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
        <span className="absolute left-4 top-4 rounded-md bg-background/85 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground">До</span>
      </div>

      <div className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-lg">
          <MoveHorizontal className="size-5" />
        </span>
      </div>
    </div>
  )
}
