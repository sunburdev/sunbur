// Unit economics of typical SUNBUR orders under the current tariffs in lib/site-data.ts.
// Run: node scripts/pricing-economics.mjs
// The assumptions below are estimates (see docs/pricing.md). Replace them with the master's
// real timings and costs; the prices are taken from the live tariff code, so they never drift.
const { calculateHolePrice, quoteOrder } = await import("../lib/site-data.ts")

const assumptions = {
  taxRate: 0.06, // УСН «доходы»
  travelHours: 1, // round trip within Solnechnogorsk district
  travelCostRub: 600, // fuel and car wear
  visitSetupHours: 40 / 60, // unloading, water, floor protection, cleanup
  overheadPerOrderRub: 1000, // equipment amortization ~400 + lead acquisition ~600
  perHoleSetupMinutes: 10, // marking, fixing the rig, removing the core
  // Drilling speed for Ø132, cm per minute. Larger crowns are slower, roughly (132 / D)^0.8.
  speedCmPerMinute132: { brick: 6, concrete: 3, reinforced: 1.8 },
  // Crown wear plus water, power and motor wear for Ø132, ₽ per cm; proportional to diameter.
  // A Ø132 crown costs 5–11 thousand ₽ and lasts 5–15 m in concrete.
  wearRubPerCm132: { brick: 4, concrete: 9, reinforced: 14 },
  conditionTimeMultiplier: 1.3, // at height or in a crawlspace
  extensionTimeMultiplier: 1.3, // depth beyond the standard crown
  extensionThresholdMm: 300,
}

// Market medians, ₽ per cm, from Moscow-region price lists collected in October 2026.
// Competitors also charge a minimum order of 6 000–9 000 ₽ plus 40–50 ₽/km beyond the MKAD.
const marketRates = [[52, 20, 28, 34], [82, 24, 32, 40], [112, 28, 40, 50], [132, 30, 42, 54], [162, 34, 48, 60], [200, 45, 60, 80], [250, 60, 85, 110]]
const marketMinimum = [6000, 9000]
const marketConditionMultiplier = 1.2

const jobs = [
  ["Вытяжка", [{ d: 132, m: "brick", depth: 250, n: 1 }]],
  ["Ввод канализации", [{ d: 112, m: "concrete", depth: 400, n: 1 }]],
  ["Трасса кондиционера", [{ d: 52, m: "brick", depth: 380, n: 1 }]],
  ["Бризер и вытяжка", [{ d: 132, m: "concrete", depth: 300, n: 2 }]],
  ["Вводы в ЖБ фундамент", [{ d: 112, m: "reinforced", depth: 300, n: 3 }]],
  ["Вентиляция на высоте", [{ d: 162, m: "concrete", depth: 250, n: 3, atHeight: true }]],
  ["Продухи, кирпич", [{ d: 132, m: "brick", depth: 380, n: 10 }]],
  ["Продухи из подпола, ЖБ", [{ d: 112, m: "reinforced", depth: 300, n: 8, underFloor: true }]],
  ["Продухи 10×8 м, бетон", [{ d: 152, m: "concrete", depth: 400, n: 16 }]],
  ["Кабельные проходы", [{ d: 52, m: "brick", depth: 250, n: 15 }]],
]

const column = { brick: 1, concrete: 2, reinforced: 3 }
function marketRate(d, m) {
  const c = column[m]
  if (d <= marketRates[0][0]) return marketRates[0][c]
  if (d >= marketRates.at(-1)[0]) return marketRates.at(-1)[c]
  const i = marketRates.findIndex((row) => row[0] >= d)
  const [lo, up] = [marketRates[i - 1], marketRates[i]]
  return lo[c] + (up[c] - lo[c]) * (d - lo[0]) / (up[0] - lo[0])
}

function marketPrice(holes, minimum) {
  const work = holes.reduce((sum, h) => sum + h.n * marketRate(h.d, h.m) * h.depth / 10 * (h.atHeight || h.underFloor ? marketConditionMultiplier : 1), 0)
  return Math.max(minimum, work)
}

function ourPrice(holes) {
  const count = holes.reduce((sum, h) => sum + h.n, 0)
  const drilling = holes.reduce((sum, h) => sum + h.n * calculateHolePrice({ diameterMm: h.d, material: h.m, depthMm: h.depth, atHeight: !!h.atHeight, underFloor: !!h.underFloor }), 0)
  return quoteOrder(drilling, count).total
}

function economics(holes, revenue) {
  const a = assumptions
  let minutes = 0
  let cost = a.travelCostRub + a.overheadPerOrderRub
  for (const h of holes) {
    const cm = h.depth / 10
    const extended = Math.max(0, cm - a.extensionThresholdMm / 10)
    const speed = a.speedCmPerMinute132[h.m] * Math.pow(132 / Math.max(h.d, 52), 0.8)
    const drilling = (cm - extended + extended * a.extensionTimeMultiplier) / speed
    minutes += h.n * (a.perHoleSetupMinutes + drilling) * (h.atHeight || h.underFloor ? a.conditionTimeMultiplier : 1)
    cost += h.n * cm * a.wearRubPerCm132[h.m] * h.d / 132
  }
  const hours = a.travelHours + a.visitSetupHours + minutes / 60
  const net = revenue * (1 - a.taxRate) - cost
  return { hours, net, perHour: net / hours }
}

const rub = (value) => Math.round(value).toLocaleString("ru-RU")
const rows = jobs.map(([name, holes]) => {
  const price = ourPrice(holes)
  const [low, high] = marketMinimum.map((minimum) => marketPrice(holes, minimum))
  const result = economics(holes, price)
  const holeCount = holes.reduce((sum, h) => sum + h.n, 0)
  return {
    "Заказ": `${name}: ${holeCount}×Ø${holes[0].d}`,
    "Наша цена, ₽": rub(price),
    "Рынок, ₽": low === high ? rub(low) : `${rub(low)}–${rub(high)}`,
    "Часов": result.hours.toFixed(1),
    "Чистыми, ₽": rub(result.net),
    "₽ в час": rub(result.perHour),
  }
})
console.table(rows)
