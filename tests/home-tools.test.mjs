import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context) } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
} })
const { calculateHomeTool, defaultToolInput, defaultRow, dewPoint, toolInputSchema } = await import("../lib/home-tools.ts")
const { applyQuantityDiscount, calculateHolePrice } = await import("../lib/site-data.ts")
const { toolsCatalog } = await import("../lib/tools-catalog.ts")

test("all catalog tools have valid defaults and finite results", () => {
  for (const tool of toolsCatalog) {
    const input = defaultToolInput(tool.id)
    assert.ok(toolInputSchema.safeParse(input).success)
    const result = calculateHomeTool(input)
    assert.equal(result.metrics.length, 3)
    assert.ok(result.summary)
    assert.ok(!JSON.stringify(result).includes("NaN"))
  }
})

test("angled drilling uses the wall normal and parallel plane geometry", () => {
  const straight = calculateHomeTool({ kind: "angle", wall: 300, angle: 0, bore: 132 }).data
  assert.equal(straight.pathLength, 300)
  assert.equal(straight.offset, 0)
  assert.equal(straight.majorAxis, 132)
  const angled = calculateHomeTool({ kind: "angle", wall: 300, angle: 60, bore: 132 }).data
  assert.ok(Math.abs(angled.pathLength - 600) < 1e-9)
  assert.ok(Math.abs(angled.offset - 300 * Math.sqrt(3)) < 1e-9)
  assert.ok(Math.abs(angled.majorAxis - 264) < 1e-9)
  assert.equal(angled.minorAxis, 132)
})

test("airflow converts cubic metres per hour for both shapes and handles zero flow", () => {
  const input = { ...defaultToolInput("airflow"), shape: "rectangular", flow: 360, ductWidth: 200, ductHeight: 100, targetSpeed: 5 }
  const rect = calculateHomeTool(input).data
  assert.equal(rect.area, .02)
  assert.equal(rect.speed, 5)
  assert.equal(rect.targetArea, .02)
  const equivalent = calculateHomeTool({ ...input, shape: "round", ductDiameter: rect.targetDiameter }).data
  assert.ok(Math.abs(equivalent.speed - 5) < 1e-9)
  const zero = calculateHomeTool({ ...input, flow: 0 }).data
  assert.equal(zero.speed, 0)
  assert.equal(zero.targetDiameter, null)
})

test("sealant accounts for annulus volume, all seams, quantities, waste and whole packages", () => {
  const result = calculateHomeTool({ kind: "sealant", hole: 100, tube: 80, fillDepth: 20, count: 3, waste: 10, pack: 310 }).data
  assert.equal(result.gap, 10)
  assert.ok(Math.abs(result.perHoleMl - 18 * Math.PI) < 1e-9)
  assert.ok(Math.abs(result.totalMl - 18 * Math.PI * 3 * 1.1) < 1e-9)
  assert.equal(result.packages, 1)
  const two = calculateHomeTool({ kind: "sealant", hole: 100, tube: 80, fillDepth: 20, count: 6, waste: 10, pack: 310 }).data
  assert.equal(two.packages, 2)
  assert.ok(two.remainderMl >= 0 && two.remainderMl < 310)
})
test("hole sizing includes both sides, never rounds down or invents a price", () => {
  const input = { ...defaultToolInput("diameter"), pipe: 110, insulation: 10, sleeve: 3, clearance: 5 }
  assert.equal(calculateHomeTool(input).data.required, 146)
  assert.equal(calculateHomeTool(input).data.selected, 152)
  const tooLarge = calculateHomeTool({ ...input, pipe: 500 })
  assert.equal(tooLarge.data.selected, null)
  assert.equal(tooLarge.data.cost, null)
  assert.equal(calculateHomeTool({ ...input, pipe: 132, insulation: 0, sleeve: 0, clearance: 0 }).data.selected, 132)
})

test("110 mm pipe selects 112, 120, 122, 127 or 132 according to explicit clearance", () => {
  for (const [clearance, selected, actualClearance] of [[1,112,1], [5,120,5], [6,122,6], [8.5,127,8.5], [10,132,11]]) {
    const result = calculateHomeTool({ ...defaultToolInput("diameter"), clearance }).data
    assert.equal(result.selected, selected)
    assert.equal(result.actualClearance, actualClearance)
    assert.equal(result.required, 110 + 2 * clearance)
    assert.equal(result.cost === null, [120,122,127].includes(selected))
  }
})

test("diameter comparison includes actual gaps and supports a larger manual choice", () => {
  const result = calculateHomeTool({ ...defaultToolInput("diameter"), preferredDiameter: 120 }).data
  assert.equal(result.minimum, 112)
  assert.equal(result.selected, 120)
  assert.equal(result.actualClearance, 5)
  assert.equal(result.cost, null)
  assert.equal(result.options.find(option => option.diameter === 132).clearance, 11)
  const invalidChoice = calculateHomeTool({ ...defaultToolInput("diameter"), clearance: 10, preferredDiameter: 112 }).data
  assert.equal(invalidChoice.minimum, 132)
  assert.equal(invalidChoice.selected, null)
  assert.equal(invalidChoice.cost, null)
})

test("legacy saved diameter projects retain their explicit gap and gain automatic selection", () => {
  const { preferredDiameter, ...legacy } = defaultToolInput("diameter")
  legacy.clearance = 10
  const parsed = toolInputSchema.parse(legacy)
  assert.equal(parsed.preferredDiameter, 0)
  assert.equal(parsed.clearance, 10)
  assert.equal(calculateHomeTool(parsed).data.selected, 132)
})
test("sewer profile uses horizontal run, percent slope and one reference datum", () => {
  const result = calculateHomeTool(defaultToolInput("slope"))
  assert.equal(result.data.drop, 20)
  assert.equal(result.data.endDepth, 60)
  assert.ok(Math.abs(result.data.pipeLength - Math.hypot(10, .2)) < 1e-9)
  const flat = calculateHomeTool({ ...defaultToolInput("slope"), slope: 0 })
  assert.equal(flat.data.drop, 0)
  assert.equal(flat.data.angle, 0)
})
test("manufacturer hole sizes are exact, not rounded to an oversized crown", () => {
  for (const model of ["tion-4s", "vakio-kiv-pro"]) assert.equal(calculateHomeTool({ ...defaultToolInput("equipment"), model }).data.selected, 132)
  const custom = calculateHomeTool({ ...defaultToolInput("equipment"), model: "custom", customDiameter: 133 })
  assert.equal(custom.data.required, 133)
  assert.equal(custom.data.selected, null)
  assert.equal(custom.data.cost, null)
})
test("estimate uses shared tariffs including depth and per-hole surcharges, with a quantity discount on the total", () => {
  const rows = [{ ...defaultRow, quantity: 3 }, { ...defaultRow, material: "brick", depth: 600, diameter: 200, quantity: 2, atHeight: true, underFloor: true }]
  const result = calculateHomeTool({ kind: "estimate", rows })
  const subtotal = rows.reduce((sum, r) => sum + r.quantity * calculateHolePrice({ diameterMm: r.diameter, material: r.material, depthMm: r.depth, atHeight: r.atHeight, underFloor: r.underFloor }), 0)
  const discount = applyQuantityDiscount(subtotal, 5)
  assert.equal(result.data.count, 5)
  assert.equal(result.data.subtotal, subtotal)
  assert.equal(result.data.discountPercent, discount.percent)
  assert.equal(result.data.discountAmount, discount.discountAmount)
  assert.equal(result.data.total, discount.total)
})
test("dew point matches reference values, saturation and equal-pressure comparison", () => {
  assert.ok(Math.abs(dewPoint(20, 50) - 9.26) < .05)
  assert.ok(Math.abs(dewPoint(20, 100) - 20) < 1e-10)
  const equal = calculateHomeTool({ kind: "moisture", insideTemp: 20, outsideTemp: 20, insideHumidity: 100, outsideHumidity: 100, surfaceTemp: 20 })
  assert.equal(equal.data.insideRisk, true)
  assert.equal(equal.data.outsideWetter, false)
  const summer = calculateHomeTool(defaultToolInput("moisture"))
  assert.equal(summer.data.outsideWetter, true)
  assert.equal(summer.data.outsideRisk, true)
})
test("invalid inputs, oversized lists and forged data are rejected", () => {
  for (const input of [
    { ...defaultToolInput("diameter"), preferredDiameter: 119 },
    { ...defaultToolInput("angle"), angle: 90 },
    { ...defaultToolInput("angle"), wall: 0 },
    { ...defaultToolInput("airflow"), targetSpeed: 0 },
    { ...defaultToolInput("airflow"), ductWidth: 0 },
    { ...defaultToolInput("airflow"), flow: -1 },
    { ...defaultToolInput("sealant"), hole: 110, tube: 110 },
    { ...defaultToolInput("sealant"), tube: 150 },
    { ...defaultToolInput("sealant"), pack: 0 },
    { ...defaultToolInput("sealant"), count: 1.5 },
    { ...defaultToolInput("diameter"), pipe: NaN },
    { ...defaultToolInput("slope"), length: -1 },
    { ...defaultToolInput("moisture"), outsideTemp: -5 },
    { ...defaultToolInput("moisture"), insideHumidity: 0 },
    { kind: "estimate", rows: [{ ...defaultRow, diameter: 133 }] },
    { kind: "estimate", rows: Array.from({ length: 31 }, () => defaultRow) },
    { kind: "estimate", rows: [{ ...defaultRow, quantity: 1.5 }] },
    { ...defaultToolInput("photo"), markers: [{ x: 101, y: 50, diameter: 132, depth: 300, material: "brick", note: "" }] },
    { ...defaultToolInput("diameter"), totalPrice: 0 },
  ]) assert.equal(toolInputSchema.safeParse(input).success, false)
})
