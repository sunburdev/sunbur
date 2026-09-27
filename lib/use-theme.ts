"use client"

import { useSyncExternalStore } from "react"
import { DEFAULT_THEME, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "@/lib/theme"

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === "light" || value === "dark") return value
  } catch {}
  return DEFAULT_THEME
}

/** Writes the theme to <html> without persisting it. */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme])
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  return () => observer.disconnect()
}

function snapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
}

/** The active theme, for code that cannot style itself through CSS variables (canvas). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_THEME)
}
