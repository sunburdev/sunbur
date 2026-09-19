import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

// Node 24 strips TypeScript; resolve the extensionless imports used by Next.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context) }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    throw error
  }
} })

const { DEFAULT_FOUNDATION, calculateVentilation, getFoundationGeometry, foundationInputSchema, walkContour } = await import("../lib/vent-calculator.ts")
const { calculateHolePrice } = await import("../lib/site-data.ts")

test("rectangle, L and U footprints exclude cutouts and clip partitions", () => {
  assert.equal(getFoundationGeometry(DEFAULT_FOUNDATION).area, 80)
  assert.equal(getFoundationGeometry({ ...DEFAULT_FOUNDATION, shape: "l" }).area, 45)
  const geometry = getFoundationGeometry({ ...DEFAULT_FOUNDATION, shape: "u", partitions: "cross" })
  assert.equal(geometry.area, 60)
  assert.equal(geometry.perimeter, 46)
  assert.equal(geometry.walls.filter(wall => wall.internal).length, 3)
  for (const wall of geometry.walls.filter(wall => wall.internal)) {
    const x = (wall.start.x + wall.end.x) / 2, z = (wall.start.z + wall.end.z) / 2
    assert.ok(!(x > 3 && x < 7 && z > 3), "partition must not cross the courtyard")
  }
})

test("external free area accounts for grille, and recommendation minimizes feasible price", () => {
  const result = calculateVentilation(DEFAULT_FOUNDATION)
  assert.equal(result.requiredArea, 0.2)
  assert.ok(result.recommendedId)
  for (const variant of result.variants) {
    const expected = variant.externalCount * Math.PI * (variant.diameterMm / 2000) ** 2 * 0.7
    assert.ok(Math.abs(variant.freeArea - expected) < 1e-10)
    if (variant.feasible) assert.ok(variant.freeArea >= result.requiredArea - 1e-8)
    assert.equal(variant.pricePerHole, calculateHolePrice({ diameterMm: variant.diameterMm, material: "concrete", depthMm: 400, atHeight: false, underFloor: false }))
    assert.equal(variant.totalPrice, variant.totalCount * variant.pricePerHole)
  }
  const selected = result.variants.find(variant => variant.id === result.recommendedId)
  assert.equal(selected.totalPrice, Math.min(...result.variants.filter(variant => variant.feasible).map(variant => variant.totalPrice)))
})

test("opposite rectangular walls use aligned openings and obey edge and pitch constraints", () => {
  const result = calculateVentilation(DEFAULT_FOUNDATION)
  for (const variant of result.variants) {
    const north = variant.vents.filter(vent => vent.wallId === "wall-1").map(vent => vent.x).sort((a,b) => a-b)
    const south = variant.vents.filter(vent => vent.wallId === "wall-3").map(vent => vent.x).sort((a,b) => a-b)
    assert.deepEqual(north, south)
    const margin = DEFAULT_FOUNDATION.cornerOffset + variant.diameterMm / 2000 + DEFAULT_FOUNDATION.thickness / 2000
    for (const wall of result.geometry.walls) {
      const length = Math.hypot(wall.end.x-wall.start.x, wall.end.z-wall.start.z)
      const offsets = variant.vents.filter(vent => vent.wallId === wall.id).map(vent => vent.offset).sort((a,b) => a-b)
      for (const [index, offset] of offsets.entries()) {
        assert.ok(offset >= margin - 1e-8 && offset <= length-margin+1e-8)
        if (index) {
          assert.ok(offset-offsets[index-1] <= DEFAULT_FOUNDATION.maxSpacing+1e-8)
          assert.ok(offset-offsets[index-1] >= variant.diameterMm / 1000 + 0.15 - 1e-8)
        }
      }
    }
  }
})

test("transfer holes are priced but never increase external ventilation area", () => {
  const result = calculateVentilation({ ...DEFAULT_FOUNDATION, partitions: "cross", underFloor: true })
  for (const variant of result.variants) {
    assert.ok(variant.internalCount > 0)
    assert.equal(variant.totalCount, variant.internalCount + variant.externalCount)
    assert.ok(Math.abs(variant.freeArea - variant.externalCount * Math.PI * (variant.diameterMm / 2000)**2 * 0.7) < 1e-10)
    for (const vent of variant.vents) {
      if (vent.internal) assert.ok(Math.abs(vent.x-5) > 0.8 || Math.abs(vent.z-4) > 0.8, "no bore at the crossing of partitions")
    }
    assert.equal(variant.totalPrice, variant.totalCount * calculateHolePrice({ diameterMm: variant.diameterMm, material: "concrete", depthMm: 400, atHeight: false, underFloor: true }))
  }
})

test("low wall or impossible side clearances cannot produce a recommended plan", () => {
  const low = calculateVentilation({ ...DEFAULT_FOUNDATION, height: 0.3, ventHeight: 0.15 })
  assert.equal(low.recommendedId, null)
  assert.ok(low.variants.every(variant => !variant.feasible && variant.vents.length === 0))
  const narrow = calculateVentilation({ ...DEFAULT_FOUNDATION, length: 2, width: 2, cornerOffset: 1.5 })
  assert.equal(narrow.recommendedId, null)
  assert.ok(narrow.variants.every(variant => !variant.feasible))
})

test("blocking grilles cannot reduce the required count for a diameter", () => {
  const open = calculateVentilation({ ...DEFAULT_FOUNDATION, grilleFreePercent: 100 })
  const mesh = calculateVentilation({ ...DEFAULT_FOUNDATION, grilleFreePercent: 40 })
  mesh.variants.forEach((variant, index) => assert.ok(variant.externalCount >= open.variants[index].externalCount))
})

test("one bore can fit a short wall, but an unvented segment cannot be ignored", () => {
  const compact = calculateVentilation({ ...DEFAULT_FOUNDATION, length: 2, width: 2 })
  assert.ok(compact.recommendedId)
  assert.equal(compact.variants[0].externalCount, 4)
  const blocked = calculateVentilation({ ...DEFAULT_FOUNDATION, shape: "l", wing: 4, partitions: "width" })
  assert.equal(blocked.recommendedId, null)
  assert.ok(blocked.variants.every(variant => variant.warnings.some(warning => warning.includes("между углом и примыканием"))))
})

test("high area demand stops at non-overlapping wall capacity without a false recommendation", () => {
  const crowded = calculateVentilation({ ...DEFAULT_FOUNDATION, length: 40, width: 40, areaRatio: 100, grilleFreePercent: 10 })
  assert.equal(crowded.recommendedId, null)
  for (const variant of crowded.variants) {
    assert.ok(!variant.feasible)
    assert.ok(variant.freeArea < crowded.requiredArea)
    assert.ok(variant.vents.length < 600)
    for (const wall of crowded.geometry.walls) {
      const offsets = variant.vents.filter(vent => vent.wallId === wall.id).map(vent => vent.offset).sort((a,b) => a-b)
      offsets.slice(1).forEach((offset,index) => assert.ok(offset-offsets[index] >= variant.diameterMm / 1000 + 0.15 - 1e-8))
    }
  }
})

test("invalid inputs and collapsed concave outlines are rejected", () => {
  for (const patch of [ { length: NaN }, { areaRatio: 0 }, { grilleFreePercent: 0 }, { height: 0.4, ventHeight: 0.5 }, { shape: "u", wing: 5 }, { shape: "l", wing: 8 } ]) {
    assert.equal(foundationInputSchema.safeParse({ ...DEFAULT_FOUNDATION, ...patch }).success, false)
  }
})

test("a custom rectilinear contour describes a cross footprint the built-in shapes cannot", () => {
  // A 10x6 body with a 4x2 bump centred on the top edge and another on the bottom.
  const cross = [
    { id: "c1", length: 4, turn: "right" }, { id: "c2", length: 2, turn: "left" }, { id: "c3", length: 3, turn: "right" },
    { id: "c4", length: 6, turn: "right" }, { id: "c5", length: 3, turn: "left" }, { id: "c6", length: 2, turn: "right" },
    { id: "c7", length: 4, turn: "right" }, { id: "c8", length: 2, turn: "left" }, { id: "c9", length: 3, turn: "right" },
    { id: "c10", length: 6, turn: "right" }, { id: "c11", length: 3, turn: "left" }, { id: "c12", length: 2, turn: "right" },
  ]
  const walk = walkContour(cross)
  assert.ok(walk.closed)
  const input = { ...DEFAULT_FOUNDATION, shape: "custom", contour: cross }
  assert.equal(foundationInputSchema.safeParse(input).success, true)
  const geometry = getFoundationGeometry(input)
  assert.equal(geometry.vertices.length, 12)
  assert.equal(geometry.area, 76)
  assert.equal(geometry.perimeter, 40)
  assert.equal(geometry.walls.filter(wall => wall.internal).length, 0)
})

test("a custom contour that doesn't return to its start is rejected with the actual gap", () => {
  const openEnded = [{ id: "c1", length: 4, turn: "right" }, { id: "c2", length: 4, turn: "right" }, { id: "c3", length: 4, turn: "right" }, { id: "c4", length: 5, turn: "right" }]
  const walk = walkContour(openEnded)
  assert.equal(walk.closed, false)
  assert.ok(Math.abs(walk.gap.z + 1) < 1e-9)
  const result = foundationInputSchema.safeParse({ ...DEFAULT_FOUNDATION, shape: "custom", contour: openEnded })
  assert.equal(result.success, false)
  assert.ok(result.error.issues.some(issue => issue.path.join(".") === "contour" && issue.message.includes("не замкнут")))
})

test("a custom contour that crosses itself is rejected even though it closes", () => {
  const selfCrossing = [
    { id: "r0", length: 3, turn: "right" }, { id: "r1", length: 4, turn: "right" }, { id: "r2", length: 2, turn: "right" }, { id: "r3", length: 2, turn: "right" },
    { id: "r4", length: 1, turn: "right" }, { id: "r5", length: 3, turn: "right" }, { id: "r6", length: 2, turn: "right" }, { id: "r7", length: 5, turn: "right" },
  ]
  assert.ok(walkContour(selfCrossing).closed)
  const result = foundationInputSchema.safeParse({ ...DEFAULT_FOUNDATION, shape: "custom", contour: selfCrossing })
  assert.equal(result.success, false)
  assert.ok(result.error.issues.some(issue => issue.path.join(".") === "contour" && issue.message.includes("самопересекается")))
})

test("normative scope and excluded costs remain visible for every result", () => {
  const result = calculateVentilation(DEFAULT_FOUNDATION)
  assert.ok(result.notes.some(note => note.includes("0,05 м²") && note.includes("не подходят")))
  assert.ok(result.notes.some(note => note.includes("не расчёт воздухообмена")))
  assert.ok(result.notes.some(note => note.includes("Решётки, гильзы")))
  assert.ok(result.notes.some(note => note.includes("1/100–1/150")))
  assert.ok(result.notes.some(note => note.includes("не от реальной отметки грунта") && note.includes("0,3 м")))
})
