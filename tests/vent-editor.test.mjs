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

const { DEFAULT_FOUNDATION, getFoundationGeometry, manualVentWarnings, ventEdgeMargin, ventMinPitch, ventViolations } = await import("../lib/vent-calculator.ts")
const { distributeEvenly, duplicateVents, mirrorAlongWall, mirrorToOppositeWall, oppositeWall, outwardNormal, snapVentOffset, ventAt, wallLength } = await import("../lib/vent-editor.ts")

const geometry = getFoundationGeometry(DEFAULT_FOUNDATION)
const wallOf = (id) => geometry.walls.find((wall) => wall.id === id)
const firstWall = geometry.walls[0]
const place = (offsets, wall = firstWall) => offsets.map((offset, index) => ventAt(`manual-${index + 1}`, wall, offset))

test("ventViolations blames both holes of a cramped pair and every hole past the margin", () => {
  const margin = ventEdgeMargin(DEFAULT_FOUNDATION, 152)
  const pitch = ventMinPitch(152)
  const vents = place([0.05, margin + 1, margin + 1 + pitch / 2])
  const found = ventViolations(DEFAULT_FOUNDATION, geometry, vents, 152)
  assert.deepEqual(found.get("manual-1"), ["edge"])
  // Flagging only the second of a too-tight pair would imply the first is fine to leave.
  assert.deepEqual(found.get("manual-2"), ["pitch"])
  assert.deepEqual(found.get("manual-3"), ["pitch"])
})

test("a clean layout produces no per-hole violations and no wall warnings", () => {
  const margin = ventEdgeMargin(DEFAULT_FOUNDATION, 152)
  const vents = place([margin, wallLength(firstWall) / 2, wallLength(firstWall) - margin])
  assert.equal(ventViolations(DEFAULT_FOUNDATION, geometry, vents, 152).size, 0)
  assert.deepEqual(manualVentWarnings(DEFAULT_FOUNDATION, geometry, vents, 152), [])
})

test("wall warnings still read off the same rules the canvas highlights", () => {
  const vents = place([0.05, 0.1])
  const warnings = manualVentWarnings(DEFAULT_FOUNDATION, geometry, vents, 152)
  assert.ok(warnings.some((warning) => warning.includes("слишком близко к краю")))
  assert.ok(warnings.some((warning) => warning.includes("слишком близко друг к другу")))
})

test("distributing spreads holes between the margins and leaves other walls alone", () => {
  const margin = ventEdgeMargin(DEFAULT_FOUNDATION, 152)
  const other = geometry.walls[1]
  const vents = [...place([1, 1.2, 8]), ventAt("manual-9", other, 2)]
  const spread = distributeEvenly(vents, geometry, ["manual-1", "manual-2", "manual-3"], margin)
  const offsets = spread.filter((vent) => vent.wallId === firstWall.id).map((vent) => vent.offset)
  const length = wallLength(firstWall)
  assert.deepEqual(offsets, [margin, length / 2, length - margin].map((value) => Number(value.toFixed(3))))
  assert.equal(spread.find((vent) => vent.id === "manual-9").offset, 2)
})

test("distributing a single hole centres it, and a wall with no room falls back to centre", () => {
  const length = wallLength(firstWall)
  const single = distributeEvenly(place([1]), geometry, ["manual-1"], 0.6)
  assert.equal(single[0].offset, Number((length / 2).toFixed(3)))
  const impossible = distributeEvenly(place([1, 2]), geometry, ["manual-1", "manual-2"], length)
  assert.deepEqual(impossible.map((vent) => vent.offset), [length / 2, length / 2].map((value) => Number(value.toFixed(3))))
})

test("mirroring along a wall reflects offsets about its midpoint", () => {
  const length = wallLength(firstWall)
  const flipped = mirrorAlongWall(place([1, 2.5]), geometry, ["manual-1", "manual-2"])
  assert.deepEqual(flipped.map((vent) => vent.offset), [length - 1, length - 2.5].map((value) => Number(value.toFixed(3))))
})

test("the opposite wall is the far parallel one, not an intervening partition", () => {
  const crossed = getFoundationGeometry({ ...DEFAULT_FOUNDATION, partitions: "length" })
  const outer = crossed.walls.find((wall) => !wall.internal && Math.abs(wall.start.z - wall.end.z) < 1e-6)
  const point = { x: (outer.start.x + outer.end.x) / 2, z: outer.start.z }
  const target = oppositeWall(crossed, outer, point)
  assert.ok(target, "a rectangle always has a facing wall")
  assert.equal(target.internal, false)
  assert.ok(Math.abs(target.start.z - outer.start.z) > 1e-6)
})

test("mirroring to the opposite wall adds holes there without moving the originals", () => {
  const vents = place([2, 4])
  const { vents: next, added } = mirrorToOppositeWall(vents, geometry, ["manual-1", "manual-2"])
  assert.equal(next.length, 4)
  assert.equal(added.length, 2)
  assert.deepEqual(next.slice(0, 2), vents)
  assert.equal(new Set(next.map((vent) => vent.id)).size, 4, "generated ids must not collide")
  for (const id of added) assert.notEqual(next.find((vent) => vent.id === id).wallId, firstWall.id)
})

test("duplicating steps one pitch along the wall, and turns back at the far end", () => {
  const pitch = ventMinPitch(152)
  const length = wallLength(firstWall)
  const ahead = duplicateVents(place([2]), geometry, ["manual-1"], pitch)
  assert.equal(ahead.vents[1].offset, Number((2 + pitch).toFixed(3)))
  const atEnd = duplicateVents(place([length]), geometry, ["manual-1"], pitch)
  assert.equal(atEnd.vents[1].offset, Number((length - pitch).toFixed(3)))
})

test("snapping prefers meaningful positions over the plain grid", () => {
  const length = wallLength(firstWall)
  const context = { wall: firstWall, neighbours: [], margin: 0.6, gridStep: 0.05, tolerance: 0.2 }
  const middle = snapVentOffset(length / 2 + 0.07, context)
  assert.equal(middle.offset, length / 2)
  assert.equal(middle.hint.kind, "middle")

  const edge = snapVentOffset(0.55, context)
  assert.equal(edge.offset, 0.6)
  assert.equal(edge.hint.kind, "margin")

  const symmetric = snapVentOffset(length - 2.06, { ...context, neighbours: [2] })
  assert.equal(symmetric.offset, length - 2)
  assert.equal(symmetric.hint.kind, "mirror")

  // 3 is only reachable as "one more step of the 1 m pitch": mirroring 4 or 5 about
  // a 10 m wall gives 6 and 5, neither within tolerance.
  const repeated = snapVentOffset(3.04, { ...context, neighbours: [4, 5] })
  assert.equal(repeated.offset, 3)
  assert.equal(repeated.hint.kind, "pitch")
})

test("an offset that is both symmetric and on-pitch reports the same reason every time", () => {
  // On a 10 m wall with holes at 2 and 4, offset 6 continues the 2 m pitch *and* sits
  // symmetric to the hole at 4. Both are true; the label must not depend on the order
  // candidates happen to be generated in.
  const context = { wall: firstWall, neighbours: [2, 4], margin: 0.6, gridStep: 0.05, tolerance: 0.2 }
  assert.equal(wallLength(firstWall), 10)
  const first = snapVentOffset(6.04, context)
  const second = snapVentOffset(5.96, context)
  assert.equal(first.offset, 6)
  assert.equal(second.offset, 6)
  assert.equal(first.hint.kind, "mirror")
  assert.equal(second.hint.kind, "mirror")
})

test("with nothing nearby, snapping falls back to the grid and stays on the wall", () => {
  const context = { wall: firstWall, neighbours: [], margin: 0.6, gridStep: 0.05, tolerance: 0.02 }
  assert.deepEqual(snapVentOffset(3.3301, context), { offset: 3.35, hint: null })
  assert.equal(snapVentOffset(-5, context).offset, 0)
  assert.equal(snapVentOffset(1000, context).offset, wallLength(firstWall))
  assert.equal(snapVentOffset(3.3301, { ...context, gridStep: 0 }).offset, 3.3301)
})

test("dimension chains are drawn outside the contour, never across the floor", () => {
  for (const wall of geometry.walls.filter((candidate) => !candidate.internal)) {
    const normal = outwardNormal(geometry, wall)
    const middle = { x: (wall.start.x + wall.end.x) / 2, z: (wall.start.z + wall.end.z) / 2 }
    const probe = { x: middle.x + normal.x * 0.2, z: middle.z + normal.z * 0.2 }
    const inside = probe.x > 0 && probe.x < DEFAULT_FOUNDATION.length && probe.z > 0 && probe.z < DEFAULT_FOUNDATION.width
    assert.equal(inside, false, `${wall.label} points its dimension chain inwards`)
  }
})

test("a hole keeps the wall it was placed on, including whether it is internal", () => {
  const crossed = getFoundationGeometry({ ...DEFAULT_FOUNDATION, partitions: "cross" })
  const partition = crossed.walls.find((wall) => wall.internal)
  const vent = ventAt("manual-1", partition, 1.5)
  assert.equal(vent.internal, true)
  assert.equal(vent.wallId, partition.id)
  assert.equal(wallOf(firstWall.id).internal, false)
})
