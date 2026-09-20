import { pointOnWall, type FoundationGeometry, type FoundationWall, type VentPlacement } from "./vent-calculator"

const EPSILON = 1e-8

export const wallLength = (wall: FoundationWall) => Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)

/** Unit vector from a wall's start towards its end. */
export const wallDirection = (wall: FoundationWall) => {
  const length = wallLength(wall) || 1
  return { x: (wall.end.x - wall.start.x) / length, z: (wall.end.z - wall.start.z) / length }
}

/** Distance from a wall's start to the nearest point of the wall to `point`,
 *  clamped to the wall — the offset a pointer at `point` means. */
export function projectOntoWall(wall: FoundationWall, point: { x: number; z: number }) {
  const direction = wallDirection(wall)
  const length = wallLength(wall)
  const along = (point.x - wall.start.x) * direction.x + (point.z - wall.start.z) * direction.z
  return Math.max(0, Math.min(length, along))
}

/** Perpendicular distance from `point` to a wall's infinite line, used to decide
 *  which wall a click belongs to when two of them meet at a corner. */
export function distanceToWall(wall: FoundationWall, point: { x: number; z: number }) {
  const at = pointOnWall(wall, projectOntoWall(wall, point))
  return Math.hypot(point.x - at.x, point.z - at.z)
}

/** Builds an id no vent in the list already uses. */
export function nextVentId(vents: VentPlacement[]) {
  let n = 1
  while (vents.some((vent) => vent.id === `manual-${n}`)) n++
  return `manual-${n}`
}

/** Materialises a vent on a wall at a given distance from that wall's start. */
export function ventAt(id: string, wall: FoundationWall, offset: number): VentPlacement {
  const point = pointOnWall(wall, offset)
  return { id, wallId: wall.id, x: point.x, z: point.z, offset: Number(offset.toFixed(3)), internal: wall.internal }
}

export type SnapKind = "middle" | "margin" | "mirror" | "pitch"

/** Tie-break order for candidates that land on the same offset — a position can
 *  honestly be both "symmetric to the hole opposite" and "one more step of the pitch".
 *  Landmarks of the wall itself outrank relationships to other holes, so the label the
 *  user sees is stable instead of depending on the order candidates were generated in. */
const SNAP_PRIORITY: SnapKind[] = ["middle", "margin", "mirror", "pitch"]
export type SnapHint = { kind: SnapKind; offset: number; label: string; from?: number }

type SnapContext = {
  wall: FoundationWall
  /** Offsets of the other vents on this wall — the dragged one must be excluded. */
  neighbours: number[]
  margin: number
  gridStep: number
  /** Snap radius in metres; the caller converts it from a pixel radius so the
   *  magnetism feels the same at every zoom level. */
  tolerance: number
}

/** Chooses where a dragged vent should actually land.
 *
 *  Meaningful positions win over the plain grid: the middle of the wall, the minimum
 *  edge clearance, a position symmetric to an existing hole, and continuing the pitch
 *  an adjacent pair already establishes. The grid is the fallback so a drag always
 *  lands on a round number rather than three decimal places of pointer noise. */
export function snapVentOffset(raw: number, context: SnapContext): { offset: number; hint: SnapHint | null } {
  const { wall, neighbours, margin, gridStep, tolerance } = context
  const length = wallLength(wall)
  const clamped = Math.max(0, Math.min(length, raw))
  const candidates: SnapHint[] = [
    { kind: "middle", offset: length / 2, label: "середина стены" },
    { kind: "margin", offset: margin, label: "минимальный отступ" },
    { kind: "margin", offset: length - margin, label: "минимальный отступ" },
  ]
  for (const neighbour of neighbours) {
    candidates.push({ kind: "mirror", offset: length - neighbour, label: "симметрично соседнему", from: neighbour })
  }
  const sorted = [...neighbours].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1]
    if (gap < EPSILON) continue
    const label = `равный шаг ${gap.toFixed(2).replace(".", ",")} м`
    candidates.push({ kind: "pitch", offset: sorted[i] + gap, label, from: sorted[i] })
    candidates.push({ kind: "pitch", offset: sorted[i - 1] - gap, label, from: sorted[i - 1] })
  }
  const best = candidates
    .filter((candidate) => candidate.offset >= -EPSILON && candidate.offset <= length + EPSILON)
    .filter((candidate) => Math.abs(candidate.offset - clamped) <= tolerance)
    .sort((a, b) => {
      const distance = Math.abs(a.offset - clamped) - Math.abs(b.offset - clamped)
      if (Math.abs(distance) > EPSILON) return distance
      return SNAP_PRIORITY.indexOf(a.kind) - SNAP_PRIORITY.indexOf(b.kind)
    })[0]
  if (best) return { offset: Math.max(0, Math.min(length, best.offset)), hint: best }
  if (gridStep <= 0) return { offset: clamped, hint: null }
  return { offset: Math.max(0, Math.min(length, Math.round(clamped / gridStep) * gridStep)), hint: null }
}

/** Spreads the given vents evenly between the two edge margins of their own wall.
 *  Vents on different walls are handled independently, so a selection spanning the
 *  whole foundation tidies every wall in one action. */
export function distributeEvenly(vents: VentPlacement[], geometry: FoundationGeometry, ids: string[], margin: number) {
  const selected = new Set(ids)
  const byWall = new Map<string, VentPlacement[]>()
  for (const vent of vents) {
    if (!selected.has(vent.id)) continue
    const list = byWall.get(vent.wallId)
    if (list) list.push(vent)
    else byWall.set(vent.wallId, [vent])
  }
  const moved = new Map<string, number>()
  for (const [wallId, group] of byWall) {
    const wall = geometry.walls.find((candidate) => candidate.id === wallId)
    if (!wall) continue
    const length = wallLength(wall)
    const usable = length - margin * 2
    const ordered = [...group].sort((a, b) => a.offset - b.offset)
    // A wall too short for its own clearances has no honest even spread; parking the
    // holes on the centre line at least keeps them inside the wall and visibly wrong,
    // which the edge-clearance warning then explains.
    if (usable <= 0 || ordered.length === 1) {
      for (const vent of ordered) moved.set(vent.id, length / 2)
      continue
    }
    const step = usable / (ordered.length - 1)
    ordered.forEach((vent, index) => moved.set(vent.id, margin + step * index))
  }
  return vents.map((vent) => {
    const offset = moved.get(vent.id)
    if (offset === undefined) return vent
    const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
    return wall ? ventAt(vent.id, wall, offset) : vent
  })
}

/** Reflects the given vents about the midpoint of their own wall. */
export function mirrorAlongWall(vents: VentPlacement[], geometry: FoundationGeometry, ids: string[]) {
  const selected = new Set(ids)
  return vents.map((vent) => {
    if (!selected.has(vent.id)) return vent
    const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
    return wall ? ventAt(vent.id, wall, wallLength(wall) - vent.offset) : vent
  })
}

/** The wall a hole should be copied to when the user asks for the opposite side.
 *
 *  Every wall here is axis-aligned, so "opposite" means the parallel wall whose span
 *  covers the hole. Where a partition also qualifies, the farthest match is taken:
 *  that is the outer wall across the building, which is what "opposite" means to
 *  someone laying out cross-ventilation. */
export function oppositeWall(geometry: FoundationGeometry, wall: FoundationWall, point: { x: number; z: number }) {
  const isHorizontal = Math.abs(wall.start.z - wall.end.z) < 1e-6
  const candidates = geometry.walls.filter((candidate) => {
    if (candidate.id === wall.id) return false
    const candidateHorizontal = Math.abs(candidate.start.z - candidate.end.z) < 1e-6
    if (candidateHorizontal !== isHorizontal) return false
    const [low, high] = isHorizontal
      ? [Math.min(candidate.start.x, candidate.end.x), Math.max(candidate.start.x, candidate.end.x)]
      : [Math.min(candidate.start.z, candidate.end.z), Math.max(candidate.start.z, candidate.end.z)]
    const along = isHorizontal ? point.x : point.z
    return along >= low - 1e-6 && along <= high + 1e-6
  })
  return candidates.sort((a, b) => distanceToWall(b, point) - distanceToWall(a, point))[0] ?? null
}

/** Copies the given vents straight across to the facing wall. Positions that land on
 *  no facing wall are skipped, so the result can be shorter than the selection. */
export function mirrorToOppositeWall(vents: VentPlacement[], geometry: FoundationGeometry, ids: string[]) {
  const selected = vents.filter((vent) => ids.includes(vent.id))
  const added: VentPlacement[] = []
  let pool = vents
  for (const vent of selected) {
    const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
    if (!wall) continue
    const target = oppositeWall(geometry, wall, vent)
    if (!target) continue
    const created = ventAt(nextVentId([...pool, ...added]), target, projectOntoWall(target, vent))
    added.push(created)
    pool = [...pool, created]
  }
  return { vents: [...vents, ...added], added: added.map((vent) => vent.id) }
}

/** Copies the given vents one minimum pitch further along their own wall. */
export function duplicateVents(vents: VentPlacement[], geometry: FoundationGeometry, ids: string[], pitch: number) {
  const selected = vents.filter((vent) => ids.includes(vent.id))
  const added: VentPlacement[] = []
  let pool = vents
  for (const vent of selected) {
    const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
    if (!wall) continue
    const length = wallLength(wall)
    // Near the far end there is no room ahead, so the copy goes back down the wall.
    const offset = vent.offset + pitch <= length ? vent.offset + pitch : Math.max(0, vent.offset - pitch)
    const created = ventAt(nextVentId([...pool, ...added]), wall, offset)
    added.push(created)
    pool = [...pool, created]
  }
  return { vents: [...vents, ...added], added: added.map((vent) => vent.id) }
}

/** Ray-casting point-in-polygon, matching the test the calculator uses for its own
 *  geometry so both agree on which side of a wall is inside the building. */
function insideContour(point: { x: number; z: number }, vertices: { x: number; z: number }[]) {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j]
    if ((a.z > point.z) !== (b.z > point.z) && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

/** Unit normal pointing away from the building, so dimension chains are drawn on the
 *  outside of the plan rather than across the floor. Internal walls have no outside:
 *  they fall back to a consistent side, which keeps their chain from jumping about
 *  as the contour changes. */
export function outwardNormal(geometry: FoundationGeometry, wall: FoundationWall) {
  const direction = wallDirection(wall)
  const normal = { x: -direction.z, z: direction.x }
  const middle = pointOnWall(wall, wallLength(wall) / 2)
  const probe = { x: middle.x + normal.x * 0.01, z: middle.z + normal.z * 0.01 }
  return insideContour(probe, geometry.vertices) ? { x: -normal.x, z: -normal.z } : normal
}
