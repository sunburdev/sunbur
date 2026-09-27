"use client"

import { useLayoutEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Theme } from "@/lib/theme"
import { applyTheme, persistTheme, readStoredTheme, useTheme } from "@/lib/use-theme"

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } }

/** Swaps the theme with a circular reveal growing from the toggle. Browsers without
 *  View Transitions (or with reduced motion) switch instantly, with transitions muted so
 *  hundreds of `transition-colors` elements don't fade out of step. */
function switchTheme(next: Theme, origin: HTMLElement) {
  const doc = document as ViewTransitionDocument
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  persistTheme(next)

  if (!doc.startViewTransition || reduceMotion) {
    const root = document.documentElement
    root.classList.add("theme-switching")
    applyTheme(next)
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")))
    return
  }

  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = doc.startViewTransition(() => applyTheme(next))
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      )
    })
    .catch(() => {})
}

/** Dark ⇄ light switch. The thumb position is driven by `[data-theme]` in CSS, so it is
 *  correct from the first paint, before React hydrates. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const light = theme === "light"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Светлая тема"
      title={light ? "Включить тёмную тему" : "Включить светлую тему"}
      onClick={(event) => switchTheme(light ? "dark" : "light", event.currentTarget)}
      className={cn(
        "theme-toggle relative inline-flex h-9 w-[68px] shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border bg-muted p-1 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-1 top-1/2 size-7 -translate-y-1/2 rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] in-data-[theme=light]:translate-x-8"
      />
      <span aria-hidden="true" className="relative grid size-7 place-items-center text-foreground transition-colors in-data-[theme=light]:text-muted-foreground">
        <Moon className="size-4" />
      </span>
      <span aria-hidden="true" className="relative grid size-7 place-items-center text-muted-foreground transition-colors in-data-[theme=light]:text-primary">
        <Sun className="size-4" />
      </span>
    </button>
  )
}

/** Keeps <html data-theme> in step with the saved choice:
 *  - React resets <html> attributes on the dev Strict Mode remount, so the saved theme is
 *    re-applied before paint (a no-op in production, where the head script set it);
 *  - printouts and PDFs are always light — paper is white, and toner is not free. */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme())
    const toPaper = () => applyTheme("light")
    const restore = () => applyTheme(readStoredTheme())
    window.addEventListener("beforeprint", toPaper)
    window.addEventListener("afterprint", restore)
    return () => {
      window.removeEventListener("beforeprint", toPaper)
      window.removeEventListener("afterprint", restore)
    }
  }, [])
  return null
}
