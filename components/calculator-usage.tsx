"use client"

import { useRef, type ReactNode, type SyntheticEvent } from "react"
import { GOALS, trackCalculator } from "@/lib/metrika"

// Navigation and page chrome (links, header theme toggle, footer) are not calculator work.
// Mark any other control that only switches pages or modes with `data-metrika-ignore`.
const NOT_CALCULATION = "a, header, footer, nav, [data-metrika-ignore]"

/**
 * Reports the first real interaction with a calculator to Yandex Metrika.
 *
 * It listens in the capture phase on a wrapper, so every field, button and canvas gesture inside
 * counts without each handler having to remember to report. Restoring a saved draft on load does
 * not count: that happens without user input. Fires once per mount.
 */
export function CalculatorUsage({ calculator, children }: { calculator: string; children: ReactNode }) {
  const reported = useRef(false)
  const report = (event: SyntheticEvent) => {
    if (reported.current || !(event.target instanceof Element) || event.target.closest(NOT_CALCULATION)) return
    reported.current = true
    trackCalculator(GOALS.use, calculator)
  }
  const onClick = (event: SyntheticEvent) => {
    if (event.target instanceof Element && event.target.closest("button")) report(event)
  }
  const onPointerDown = (event: SyntheticEvent) => {
    if (event.target instanceof HTMLCanvasElement) report(event)
  }
  // `display: contents` keeps the wrapper out of the layout, so the calculators' CSS is unaffected.
  return <div style={{ display: "contents" }} onChangeCapture={report} onClickCapture={onClick} onPointerDownCapture={onPointerDown}>{children}</div>
}
