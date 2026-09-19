import { z } from "zod"
import { calculateHolePrice, priceRates, type MaterialKey } from "./site-data"

export type ContourStep = { id: string; length: number; turn: "left" | "right" }

export type FoundationInput = {
  shape: "rectangle" | "l" | "u" | "custom"
  length: number
  width: number
  height: number
  thickness: number
  wing: number
  contour: ContourStep[]
  partitions: "none" | "length" | "width" | "cross"
  material: MaterialKey
  grilleFreePercent: number
  areaRatio: number
  maxSpacing: number
  cornerOffset: number
  ventHeight: number
  underFloor: boolean
}

export const DEFAULT_FOUNDATION: FoundationInput = {
  shape: "rectangle", length: 10, width: 8, height: 0.8, thickness: 400,
  wing: 3, contour: [{ id: "c1", length: 10, turn: "right" }, { id: "c2", length: 8, turn: "right" }, { id: "c3", length: 10, turn: "right" }, { id: "c4", length: 8, turn: "right" }],
  partitions: "none", material: "concrete", grilleFreePercent: 70,
  areaRatio: 400, maxSpacing: 3, cornerOffset: 0.6, ventHeight: 0.4,
  underFloor: false,
}

const dimension = (label: string, min: number, max: number, unit: string) => {
  const range = `${label}: от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ${unit}.`
  return z.number({ error: `${label}: введите число.` }).finite({ error: range }).min(min, { error: range }).max(max, { error: range })
}

const contourStepSchema = z.object({
  id: z.string().min(1).max(40),
  length: dimension("Длина стены контура", 0.3, 40, "м"),
  turn: z.enum(["left", "right"], { error: "Выберите направление поворота." }),
}).strict()

/** Walks a rectilinear perimeter starting at (0,0) heading +x (east), turning 90°
 *  left/right after each step. `gap` is where the walk actually ends up — (0,0)
 *  only when the described walls close back on themselves. */
export function walkContour(steps: { length: number; turn: "left" | "right" }[]) {
  const vertices: FoundationPoint[] = [{ x: 0, z: 0 }]
  let point = { x: 0, z: 0 }
  let heading = { x: 1, z: 0 }
  for (let i = 0; i < steps.length; i++) {
    point = { x: point.x + heading.x * steps[i].length, z: point.z + heading.z * steps[i].length }
    if (i < steps.length - 1) vertices.push(point)
    heading = steps[i].turn === "right" ? { x: -heading.z, z: heading.x } : { x: heading.z, z: -heading.x }
  }
  const closed = Math.hypot(point.x, point.z) < 1e-6 && Math.hypot(heading.x - 1, heading.z) < 1e-6
  return { vertices, gap: point, closed }
}

/** Rectilinear-only self-intersection check: every segment is horizontal or vertical,
 *  so a crossing is either a 1D overlap on the shared axis or a T/X crossing. */
function contourSelfIntersects(vertices: FoundationPoint[]) {
  const EPSILON = 1e-6
  const segments = vertices.map((v, i) => ({ a: v, b: vertices[(i + 1) % vertices.length] }))
  const overlaps1D = (a0: number, a1: number, b0: number, b1: number) =>
    Math.max(Math.min(a0, a1), Math.min(b0, b1)) < Math.min(Math.max(a0, a1), Math.max(b0, b1)) - EPSILON
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (j === i + 1 || (i === 0 && j === segments.length - 1)) continue
      const s1 = segments[i], s2 = segments[j]
      const horizontal1 = Math.abs(s1.a.z - s1.b.z) < EPSILON, horizontal2 = Math.abs(s2.a.z - s2.b.z) < EPSILON
      if (horizontal1 && horizontal2) {
        if (Math.abs(s1.a.z - s2.a.z) < EPSILON && overlaps1D(s1.a.x, s1.b.x, s2.a.x, s2.b.x)) return true
      } else if (!horizontal1 && !horizontal2) {
        if (Math.abs(s1.a.x - s2.a.x) < EPSILON && overlaps1D(s1.a.z, s1.b.z, s2.a.z, s2.b.z)) return true
      } else {
        const h = horizontal1 ? s1 : s2, v = horizontal1 ? s2 : s1
        if (v.a.x >= Math.min(h.a.x, h.b.x) - EPSILON && v.a.x <= Math.max(h.a.x, h.b.x) + EPSILON &&
          h.a.z >= Math.min(v.a.z, v.b.z) - EPSILON && h.a.z <= Math.max(v.a.z, v.b.z) + EPSILON) return true
      }
    }
  }
  return false
}

export function validateContour(steps: { length: number; turn: "left" | "right" }[]) {
  const walk = walkContour(steps)
  const selfIntersects = walk.closed && contourSelfIntersects(walk.vertices)
  return { ...walk, selfIntersects, valid: walk.closed && !selfIntersects }
}

export const foundationInputSchema = z.object({
  shape: z.enum(["rectangle", "l", "u", "custom"], { error: "Выберите форму фундамента." }),
  length: dimension("Длина", 2, 40, "м"),
  width: dimension("Ширина", 2, 40, "м"),
  height: dimension("Высота цоколя", 0.3, 2.5, "м"),
  thickness: dimension("Толщина стены", 100, 1000, "мм"),
  wing: dimension("Ширина крыла", 1, 20, "м"),
  contour: z.array(contourStepSchema).min(4, { error: "Контур должен содержать минимум 4 стены." }).max(32, { error: "Слишком много стен — не более 32." }),
  partitions: z.enum(["none", "length", "width", "cross"], { error: "Выберите расположение внутренних стен." }),
  material: z.enum(["concrete", "reinforced", "brick"], { error: "Выберите материал фундамента." }),
  grilleFreePercent: dimension("Живое сечение решётки", 10, 100, "%"),
  areaRatio: dimension("Знаменатель доли площади", 100, 1000, ""),
  maxSpacing: dimension("Максимальный шаг", 0.5, 5, "м"),
  cornerOffset: dimension("Отступ от грани", 0.15, 1.5, "м"),
  ventHeight: dimension("Высота центра", 0.1, 2.4, "м"),
  underFloor: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.ventHeight >= value.height) {
    context.addIssue({ code: "custom", path: ["ventHeight"], message: "Центр продуха должен быть ниже верха цоколя." })
  }
  const wallWidth = value.thickness / 1000
  if (value.shape !== "custom" && Math.min(value.length, value.width) <= wallWidth * 2) {
    context.addIssue({ code: "custom", path: ["thickness"], message: "Толщина стен не оставляет свободного подполья." })
  }
  if ((value.shape === "l" || value.shape === "u") && value.wing <= wallWidth * 2) {
    context.addIssue({ code: "custom", path: ["wing"], message: "Ширина крыла должна быть больше двойной толщины стены." })
  }
  if (value.shape === "l" && value.wing >= Math.min(value.length, value.width) - 0.5) {
    context.addIssue({ code: "custom", path: ["wing"], message: "Для Г-формы оставьте вырез не менее 0,5 м с каждой стороны." })
  }
  if (value.shape === "u" && (value.wing * 2 >= value.length - 0.5 || value.wing >= value.width - 0.5)) {
    context.addIssue({ code: "custom", path: ["wing"], message: "Для П-формы оставьте между крыльями и над перемычкой вырез не менее 0,5 м." })
  }
  if (value.shape === "custom") {
    const contour = validateContour(value.contour)
    if (!contour.closed) context.addIssue({ code: "custom", path: ["contour"], message: `Контур не замкнут: конец не совпадает с началом (Δx=${contour.gap.x.toFixed(2)} м, Δz=${contour.gap.z.toFixed(2)} м). Проверьте длины стен и повороты.` })
    else if (contour.selfIntersects) context.addIssue({ code: "custom", path: ["contour"], message: "Контур самопересекается — стены заходят друг на друга. Проверьте порядок поворотов." })
    else {
      const wallWidthLocal = value.thickness / 1000
      const spanX = Math.max(...contour.vertices.map(v => v.x)) - Math.min(...contour.vertices.map(v => v.x))
      const spanZ = Math.max(...contour.vertices.map(v => v.z)) - Math.min(...contour.vertices.map(v => v.z))
      if (Math.min(spanX, spanZ) <= wallWidthLocal * 2) context.addIssue({ code: "custom", path: ["contour"], message: "Толщина стен не оставляет свободного подполья." })
    }
  }
})

export type FoundationProjectV1 = Record<string, unknown> & { version: 1; input: FoundationInput }

/** Adds fields introduced after the original v1 format, then validates the result. */
export function migrateFoundationProjectV1(raw: unknown): FoundationProjectV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const project = raw as Record<string, unknown>
  if (project.version !== 1 || !project.input || typeof project.input !== "object" || Array.isArray(project.input)) return null
  const input = project.input as Record<string, unknown>
  const candidate = "contour" in input ? input : { ...input, contour: DEFAULT_FOUNDATION.contour.map(step => ({ ...step })) }
  const parsed = foundationInputSchema.safeParse(candidate)
  return parsed.success ? { ...project, version: 1, input: parsed.data } : null
}

export type FoundationPoint = { x: number; z: number }
export type FoundationWall = { id: string; label: string; start: FoundationPoint; end: FoundationPoint; internal: boolean }
export type FoundationGeometry = { vertices: FoundationPoint[]; walls: FoundationWall[]; area: number; perimeter: number }
export type VentPlacement = { id: string; wallId: string; x: number; z: number; offset: number; internal: boolean }
export type VentVariant = {
  id: string; diameterMm: number; vents: VentPlacement[]; externalCount: number;
  internalCount: number; totalCount: number; freeArea: number; coverage: number;
  pricePerHole: number; totalPrice: number; feasible: boolean; warnings: string[];
}

export const CALCULATION_SOURCES = [
  {
    title: "СП 54.13330.2022 — официальный реестр Росстандарта",
    url: "https://protect.gost.ru/sp/details/c8b00dd7-7c13-4f17-ac0c-d9cf70311263",
    note: "Область применения — многоквартирные здания. Формула 1/400 не означает автоматического соответствия всем требованиям этого СП.",
  },
  {
    title: "СП 54.13330.2022 — публикация Минстроя",
    url: "https://www.minstroyrf.gov.ru/docs/223332/",
    note: "Пункт 7.8 содержит требования к общей площади и площади одного продуха от 0,05 м². Круг Ø250 мм имеет только 0,0491 м² до установки решётки.",
  },
  {
    title: "СП 55.13330.2016 — официальный реестр Росстандарта",
    url: "https://protect.gost.ru/sp/details/a99146d7-4dc6-4bb8-96e0-35e0233050c2",
    note: "Для одноквартирного дома применимость требований и решение по вентиляции определяют по проекту; этот калькулятор даёт предварительный сценарий.",
  },
] as const

const EPSILON = 1e-8
// Geometric assumptions only. These are not structural design clearances.
const VERTICAL_EDGE_CLEARANCE = 0.1
const MINIMUM_WEB = 0.15
const DIAMETERS = [132, 152, 162, 200, 250] as const
const distance = (a: FoundationPoint, b: FoundationPoint) => Math.hypot(b.x - a.x, b.z - a.z)
const horizontal = (wall: FoundationWall) => Math.abs(wall.start.z - wall.end.z) < EPSILON
const along = (point: FoundationPoint, wall: FoundationWall) => horizontal(wall) ? point.x : point.z

function insidePolygon(point: FoundationPoint, vertices: FoundationPoint[]) {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j]
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

/** Dimensions follow wall centre lines; area intentionally does not subtract wall footprints. */
export function getFoundationGeometry(input: FoundationInput): FoundationGeometry {
  const value = foundationInputSchema.parse(input)
  let { length: l, width: w } = value
  const { wing: g } = value
  let vertices: FoundationPoint[]
  if (value.shape === "custom") {
    const walk = walkContour(value.contour)
    const minX = Math.min(...walk.vertices.map(v => v.x)), minZ = Math.min(...walk.vertices.map(v => v.z))
    vertices = walk.vertices.map(v => ({ x: v.x - minX, z: v.z - minZ }))
    // The bounding box, not the entered length/width, drives the built-in partition preset below.
    l = Math.max(...vertices.map(v => v.x)); w = Math.max(...vertices.map(v => v.z))
  } else {
    const coords = value.shape === "l"
      ? [[0, 0], [l, 0], [l, g], [g, g], [g, w], [0, w]]
      : value.shape === "u"
        ? [[0, 0], [l, 0], [l, w], [l - g, w], [l - g, g], [g, g], [g, w], [0, w]]
        : [[0, 0], [l, 0], [l, w], [0, w]]
    vertices = coords.map(([x, z]) => ({ x, z }))
  }
  const walls: FoundationWall[] = vertices.map((start, index) => ({
    id: `wall-${index + 1}`, label: `Стена ${index + 1}`, start,
    end: vertices[(index + 1) % vertices.length], internal: false,
  }))
  const perimeter = walls.reduce((sum, wall) => sum + distance(wall.start, wall.end), 0)
  const area = Math.abs(vertices.reduce((sum, point, index) => {
    const next = vertices[(index + 1) % vertices.length]
    return sum + point.x * next.z - next.x * point.z
  }, 0)) / 2

  // Clip each partition independently against the concave footprint. A partition
  // coincident with an outside edge is not emitted a second time.
  const addPartition = (isHorizontal: boolean) => {
    const fixed = isHorizontal ? w / 2 : l / 2
    const axis = isHorizontal ? "x" : "z"
    const cuts = [...new Set(vertices.map(point => point[axis]))].sort((a, b) => a - b)
    const spans: [number, number][] = []
    for (let i = 0; i < cuts.length - 1; i++) {
      const mid = (cuts[i] + cuts[i + 1]) / 2
      const a = isHorizontal ? { x: mid, z: fixed - EPSILON } : { x: fixed - EPSILON, z: mid }
      const b = isHorizontal ? { x: mid, z: fixed + EPSILON } : { x: fixed + EPSILON, z: mid }
      if (!insidePolygon(a, vertices) || !insidePolygon(b, vertices)) continue
      const previous = spans[spans.length - 1]
      if (previous && Math.abs(previous[1] - cuts[i]) < EPSILON) previous[1] = cuts[i + 1]
      else spans.push([cuts[i], cuts[i + 1]])
    }
    for (const [start, end] of spans) {
      const index = walls.filter(wall => wall.internal).length + 1
      walls.push({ id: `partition-${index}`, label: `Перемычка ${index}`, internal: true,
        start: isHorizontal ? { x: start, z: fixed } : { x: fixed, z: start },
        end: isHorizontal ? { x: end, z: fixed } : { x: fixed, z: end },
      })
    }
  }
  if (value.partitions === "length" || value.partitions === "cross") addPartition(true)
  if (value.partitions === "width" || value.partitions === "cross") addPartition(false)
  return { vertices, walls, area, perimeter }
}

type Interval = { wall: FoundationWall; low: number; high: number; count: number; capacity: number }

function wallIntervals(wall: FoundationWall, walls: FoundationWall[], margin: number, minPitch: number, maxSpacing: number) {
  const low = Math.min(along(wall.start, wall), along(wall.end, wall))
  const high = Math.max(along(wall.start, wall), along(wall.end, wall))
  const crossings: number[] = []
  for (const other of walls) {
    if (horizontal(other) === horizontal(wall)) continue
    const coordinate = horizontal(wall) ? other.start.x : other.start.z
    const fixed = horizontal(wall) ? wall.start.z : wall.start.x
    const otherLow = Math.min(along(other.start, other), along(other.end, other))
    const otherHigh = Math.max(along(other.start, other), along(other.end, other))
    if (coordinate > low + EPSILON && coordinate < high - EPSILON && fixed >= otherLow - EPSILON && fixed <= otherHigh + EPSILON) crossings.push(coordinate)
  }
  const cuts = [low, ...[...new Set(crossings)].sort((a, b) => a - b), high]
  const intervals: Interval[] = []
  let blocked = false
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i] + margin, b = cuts[i + 1] - margin
    if (a > b + EPSILON) {
      blocked = true
      continue
    }
    const span = Math.max(0, b - a)
    const capacity = Math.floor((span + EPSILON) / minPitch) + 1
    intervals.push({ wall, low: a, high: b,
      count: capacity === 1 && span <= maxSpacing ? 1 : Math.max(1, Math.ceil(span / maxSpacing) + 1),
      capacity,
    })
  }
  return { intervals, blocked }
}

function intervalPositions(interval: Interval) {
  if (interval.count === 1) return [(interval.low + interval.high) / 2]
  return Array.from({ length: interval.count }, (_, index) => interval.low + (interval.high - interval.low) * index / (interval.count - 1))
}

function makePlacement(wall: FoundationWall, coordinate: number, index: number): VentPlacement {
  const point = horizontal(wall) ? { x: coordinate, z: wall.start.z } : { x: wall.start.x, z: coordinate }
  return { id: `${wall.id}-vent-${index}`, wallId: wall.id, ...point,
    offset: distance(wall.start, point), internal: wall.internal }
}

function calculateVariant(value: FoundationInput, geometry: FoundationGeometry, diameterMm: number, requiredArea: number): VentVariant {
  const diameter = diameterMm / 1000
  const radius = diameter / 2
  const oneFreeArea = Math.PI * radius ** 2 * value.grilleFreePercent / 100
  const margin = value.cornerOffset + radius + value.thickness / 2000
  const minPitch = diameter + MINIMUM_WEB
  const warnings: string[] = []
  let feasible = true
  const heightFits = value.ventHeight - radius >= VERTICAL_EDGE_CLEARANCE - EPSILON && value.height - value.ventHeight - radius >= VERTICAL_EDGE_CLEARANCE - EPSILON
  if (!heightFits) {
    warnings.push(`Ø${diameterMm} не помещается по высоте: модели нужен запас по 100 мм от края отверстия до низа и верха цоколя.`)
    feasible = false
  }
  const external: Interval[] = []
  const internal: Interval[] = []
  for (const wall of geometry.walls) {
    const { intervals, blocked } = wallIntervals(wall, geometry.walls, margin, minPitch, value.maxSpacing)
    if (blocked) {
      warnings.push(`${wall.label}: на участке между углом и примыканием не хватает длины для отверстия с заданными отступами.`)
      feasible = false
    }
    for (const interval of intervals) {
      if (interval.count > interval.capacity) {
        feasible = false
        warnings.push(`${wall.label}: выбранный шаг требует слишком близко расположенных отверстий.`)
        interval.count = interval.capacity
      }
      ;(wall.internal ? internal : external).push(interval)
    }
  }

  // Matching global spans share a count and coordinates, preserving opposed
  // pairs on rectangular walls even when their winding direction is reversed.
  const groups = new Map<string, Interval[]>()
  for (const interval of external) {
    const key = `${horizontal(interval.wall) ? "x" : "z"}:${interval.low.toFixed(7)}:${interval.high.toFixed(7)}`
    groups.set(key, [...(groups.get(key) ?? []), interval])
  }
  const wantedExternal = Math.ceil(requiredArea / oneFreeArea - EPSILON)
  const externalCount = () => external.reduce((sum, interval) => sum + interval.count, 0)
  while (externalCount() < wantedExternal) {
    const candidates = [...groups.values()].filter(group => group.every(interval => interval.count < interval.capacity))
    candidates.sort((a, b) => (b[0].high - b[0].low) / b[0].count - (a[0].high - a[0].low) / a[0].count)
    if (!candidates.length) {
      feasible = false
      warnings.push("Требуемая площадь не помещается на стенах с заданными отступами и запасом между отверстиями.")
      break
    }
    for (const interval of candidates[0]) interval.count++
  }

  // Preliminary transfer allowance: on each partition axis provide at least
  // half of the outside target area, distributed across its available spans.
  // This does not model pressure, wind or separate-room air exchange.
  for (const isHorizontal of [true, false]) {
    const intervals = internal.filter(interval => horizontal(interval.wall) === isHorizontal)
    if (!intervals.length) continue
    const wanted = Math.ceil(requiredArea / (2 * oneFreeArea) - EPSILON)
    while (intervals.reduce((sum, interval) => sum + interval.count, 0) < wanted) {
      const candidates = intervals.filter(interval => interval.count < interval.capacity)
      candidates.sort((a, b) => (b.high - b.low) / b.count - (a.high - a.low) / a.count)
      if (!candidates.length) {
        feasible = false
        warnings.push("Во внутренних перемычках не помещается принятый в модели запас переточных отверстий.")
        break
      }
      candidates[0].count++
    }
  }

  const vents: VentPlacement[] = []
  if (heightFits) {
    for (const interval of external) {
      for (const coordinate of intervalPositions(interval)) vents.push(makePlacement(interval.wall, coordinate, vents.length + 1))
    }
    for (const interval of internal) {
      const positions = intervalPositions(interval)
      const sameAxis = external.filter(candidate => horizontal(candidate.wall) === horizontal(interval.wall)).flatMap(intervalPositions)
      const aligned = positions.map(coordinate => sameAxis.filter(candidate => candidate >= interval.low - EPSILON && candidate <= interval.high + EPSILON && Math.abs(candidate - coordinate) <= 0.15)
        .sort((a, b) => Math.abs(a - coordinate) - Math.abs(b - coordinate))[0] ?? coordinate)
      const canAlign = aligned.every((coordinate, index) => index === 0 || (coordinate - aligned[index - 1] >= minPitch - EPSILON && coordinate - aligned[index - 1] <= value.maxSpacing + EPSILON))
      for (const coordinate of canAlign ? aligned : positions) vents.push(makePlacement(interval.wall, coordinate, vents.length + 1))
    }
  }
  const outsideCount = vents.filter(vent => !vent.internal).length
  const insideCount = vents.length - outsideCount
  const freeArea = outsideCount * oneFreeArea
  const pricePerHole = calculateHolePrice({ diameterMm, material: value.material, depthMm: value.thickness, atHeight: false, underFloor: value.underFloor })
  return {
    id: `diameter-${diameterMm}`, diameterMm, vents, externalCount: outsideCount,
    internalCount: insideCount, totalCount: vents.length, freeArea,
    coverage: freeArea / requiredArea, pricePerHole, totalPrice: vents.length * pricePerHole,
    feasible: feasible && freeArea >= requiredArea - EPSILON, warnings: [...new Set(warnings)],
  }
}

export function calculateVentilation(input: FoundationInput) {
  const value = foundationInputSchema.parse(input)
  const geometry = getFoundationGeometry(value)
  const requiredArea = geometry.area / value.areaRatio
  const variants = DIAMETERS.filter(diameter => priceRates.some(rate => rate.diameterMm === diameter))
    .map(diameter => calculateVariant(value, geometry, diameter, requiredArea))
  const recommended = variants.filter(variant => variant.feasible)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.totalCount - b.totalCount || a.diameterMm - b.diameterMm)[0]
  const notes = [
    `Предварительный сценарий: живое сечение наружных отверстий = площадь контура / ${value.areaRatio}. Коэффициент выбран пользователем; это не расчёт воздухообмена и не заключение о соответствии нормам.`,
    "На радоноопасных грунтах суммарную площадь продухов принято увеличивать: коэффициент ужесточают до 1/100–1/150 вместо 1/400. Радоновый фон участка эта модель не определяет — при риске уменьшите значение в поле «Площадь: 1/» и уточните обстановку по изысканиям.",
    "СП 54.13330.2022 относится к многоквартирным зданиям и содержит отдельное требование площади одного продуха от 0,05 м². Все рассматриваемые круглые отверстия Ø132–250 мм меньше этого значения даже без решётки; для такого проекта эти варианты не подходят.",
    `Площадь ${geometry.area.toFixed(2)} м² взята по осям стен без вычета их толщины. Вырезы Г- и П-форм исключены. Живое сечение решётки ${value.grilleFreePercent}% — допущение: уточните его по паспорту изделия.`,
    `Шаг до ${value.maxSpacing} м в пределах участка между примыканиями. Отступ ${value.cornerOffset} м измеряется от грани примыкающей стены до края отверстия; от оси узла до центра отверстия добавляются половина толщины стены и радиус. Запас сверху и снизу 100 мм и между отверстиями 150 мм — настройки геометрической модели, а не нормативная проверка прочности.`,
    "Высота центра отсчитывается от низа цоколя в модели, а не от реальной отметки грунта у дома — если часть цоколя ниже уровня земли, эти высоты не совпадают. На практике продухи располагают не ниже ~0,3 м над уровнем земли, чтобы их не перекрыло снегом или отмосткой; отметку грунта, снег, воду, арматуру, коммуникации, несущую способность и радон эта модель не определяет — места бурения сверяют с проектом и обследованием.",
    "Стоимость — ориентир по тарифам SUNBUR за отверстие с учётом толщины и выбранного доступа. Решётки, гильзы, отделка, обследование и дополнительные условия объекта в неё не включены.",
  ]
  if (value.partitions !== "none") notes.push("Переточные отверстия в перемычках считаются и оплачиваются отдельно: на каждое направление перемычек принят запас половины требуемой наружной площади. Они не добавляются к наружному живому сечению. Воздухообмен каждого отсека требует отдельной проверки.")
  if (value.shape !== "rectangle") notes.push("В угловых отсеках и вырезах сложного контура возможны застойные зоны; равномерная расстановка сама по себе не подтверждает сквозное проветривание.")
  if (!recommended) notes.push("При этих параметрах подходящий вариант не найден: измените геометрию, высоту или допущения и повторите расчёт.")
  return { geometry, requiredArea, variants, recommendedId: recommended?.id ?? null, notes }
}
