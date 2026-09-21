"use client"

import { useCallback, useMemo, useRef, useState } from "react"

/** How long two commits sharing a coalesce key stay mergeable once the pointer is up.
 *  Long enough to absorb a burst of arrow-key nudges, short enough that a deliberate
 *  second edit a moment later lands as its own undo step. */
const COALESCE_WINDOW_MS = 800

type Frame<T> = { value: T; key: string | null; at: number }
type Timeline<T> = { past: Frame<T>[]; present: Frame<T>; future: Frame<T>[] }

/** Undo/redo over a single snapshot value.
 *
 *  Two things stop a drag from filling the history with one entry per pointer move:
 *  a `coalesce` key, which merges a commit into the previous one when the keys match,
 *  and `lock()`, which holds that merge open for as long as a gesture lasts regardless
 *  of time. A commit with a different key — or no key — always starts a new step.
 *
 *  The whole timeline is one state value so every transition is a pure updater: React
 *  may invoke these twice in development, and a nested setState would double-push. */
export function useHistory<T>(initial: T, limit = 120) {
  const [timeline, setTimeline] = useState<Timeline<T>>({ past: [], present: { value: initial, key: null, at: 0 }, future: [] })
  // The gesture lock lives in a ref: pointer handlers read it between renders, and
  // flipping it must never itself schedule one.
  const locked = useRef(false)

  const commit = useCallback((next: T | ((previous: T) => T), options?: { coalesce?: string }) => {
    const key = options?.coalesce ?? null
    setTimeline((current) => {
      const { past, present } = current
      const value = typeof next === "function" ? (next as (previous: T) => T)(present.value) : next
      if (Object.is(value, present.value)) return current
      const frame = { value, key, at: Date.now() }
      const mergeable = key !== null && key === present.key && (locked.current || Date.now() - present.at < COALESCE_WINDOW_MS)
      if (mergeable) return { ...current, present: frame, future: [] }
      return { past: [...past, present].slice(-limit), present: frame, future: [] }
    })
  }, [limit])

  /** Holds the current coalesce key open for the length of a gesture. */
  const lock = useCallback(() => { locked.current = true }, [])

  /** Ends the gesture, so the next commit starts a fresh undo step. */
  const unlock = useCallback(() => {
    locked.current = false
    setTimeline((current) => (current.present.key === null ? current : { ...current, present: { ...current.present, key: null } }))
  }, [])

  const undo = useCallback(() => {
    locked.current = false
    setTimeline((current) => {
      if (!current.past.length) return current
      return {
        past: current.past.slice(0, -1),
        present: current.past[current.past.length - 1],
        future: [current.present, ...current.future].slice(0, limit),
      }
    })
  }, [limit])

  const redo = useCallback(() => {
    locked.current = false
    setTimeline((current) => {
      if (!current.future.length) return current
      const [next, ...rest] = current.future
      return { past: [...current.past, current.present].slice(-limit), present: next, future: rest }
    })
  }, [limit])

  /** Replaces the value and drops the history — for loading a saved or imported
   *  project, where undoing back into someone else's session makes no sense. */
  const reset = useCallback((value: T) => {
    locked.current = false
    setTimeline({ past: [], present: { value, key: null, at: 0 }, future: [] })
  }, [])

  return useMemo(() => ({
    state: timeline.present.value, commit, undo, redo, reset, lock, unlock,
    canUndo: timeline.past.length > 0, canRedo: timeline.future.length > 0,
  }), [timeline, commit, undo, redo, reset, lock, unlock])
}
