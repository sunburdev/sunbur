/** Yandex Metrika counter shared by the loader in `app/layout.tsx` and goal tracking. */
export const METRIKA_ID = 112468968

/**
 * Calculator identifiers sent as the `calculator` goal parameter. The online tools use
 * their URL slug (see `lib/tools-catalog.ts`), so reports read the same as the site map.
 */
export const CALCULATORS = {
  price: "price-calculator",
  ventConstructor: "kalkulyator-produhov",
  ventAudit: "proverka-produhov",
} as const

/**
 * JavaScript-event goals. Create a goal with the same identifier in the Metrika
 * counter settings ("Цели" → "JavaScript-событие") to see the numbers in reports.
 */
export const GOALS = {
  /** First interaction with a calculator on a page view. */
  use: "calculator_use",
  /** A question was answered by the calculator's AI assistant. */
  aiQuestion: "calculator_ai_question",
  /** The calculation was sent to print / PDF. */
  print: "calculator_print",
  /** The project was saved to a JSON file. */
  save: "calculator_save",
} as const

type Goal = (typeof GOALS)[keyof typeof GOALS]

declare global {
  interface Window {
    ym?: (counterId: number, method: "reachGoal", goal: string, params?: Record<string, string>) => void
  }
}

/** Sends a goal tagged with the calculator it came from. Never throws: analytics must not break a calculation. */
export function trackCalculator(goal: Goal, calculator: string) {
  try {
    window.ym?.(METRIKA_ID, "reachGoal", goal, { calculator })
  } catch { /* Metrika may be blocked or not loaded yet. */ }
}
