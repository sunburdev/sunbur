import { z } from "zod"
import { DEFAULT_FOUNDATION, foundationInputSchema, getFoundationGeometry, type FoundationWall, type FoundationPoint } from "./vent-calculator"
import { calculateHolePrice } from "./site-data"

const n = (min: number, max: number) => z.number().finite().min(min).max(max)
const id = z.string().min(1).max(60)
export const openingSchema = z.object({
  id, wallId: id, offset: n(0, 80), height: n(0, 2.5),
  shape: z.enum(["circle", "rectangle"]), diameter: n(20, 1000), width: n(20, 2000), openingHeight: n(20, 2000),
  freePercent: n(1, 100).nullable(), state: z.enum(["open", "closed", "unknown"]),
  outlet: z.enum(["auto", "enclosed", "unknown"]), expandable: z.boolean(),
}).strict()
export const auditProjectSchema = z.object({
  version: z.literal(2), mode: z.literal("audit"),
  foundation: foundationInputSchema,
  kind: z.enum(["crawlspace", "basement", "slab", "unknown"]),
  partitions: z.array(z.object({ id, axis: z.enum(["x", "z"]), position: n(0.1, 39.9),
    material: z.enum(["concrete", "reinforced", "brick"]).default("brick"), thickness: n(100, 1000).default(200) }).strict()).max(8),
  openings: z.array(openingSchema).max(100),
  blocked: z.array(z.object({ id, wallId: id, from: n(0, 80), to: n(0, 80) }).strict()).max(40),
  groundLevel: n(-2, 2.5).nullable(),
  allowNew: z.boolean(), inventoryComplete: z.boolean(),
}).strict().superRefine((p, ctx) => {
  for (const key of ["openings", "partitions", "blocked"] as const) {
    if (new Set(p[key].map(x => x.id)).size !== p[key].length) ctx.addIssue({ code: "custom", path: [key], message: "Номера объектов не должны повторяться." })
  }
  if (p.foundation.partitions !== "none") ctx.addIssue({ code: "custom", path: ["foundation", "partitions"], message: "В проекте проверки внутренние стены задаются списком перемычек, а не этим полем." })
})
export type AuditProject = z.infer<typeof auditProjectSchema>
export type Opening = z.infer<typeof openingSchema>
export type Issue = { code: string; text: string; level: "problem" | "unknown" | "note"; wallId?: string; openingId?: string }
export type Action = { kind: "add" | "enlarge"; opening: Opening; before?: Opening; reason: string; gain: number; price: number | null }
export const newAuditProject = (): AuditProject => ({ version: 2, mode: "audit", foundation: { ...DEFAULT_FOUNDATION, partitions: "none" }, kind: "crawlspace", partitions: [], openings: [], blocked: [], groundLevel: null, allowNew: true, inventoryComplete: false })
export const newOpening = (wallId: string, offset: number, height: number, openingId: string): Opening => ({ id: openingId, wallId, offset, height, shape: "circle", diameter: 150, width: 150, openingHeight: 150, freePercent: null, state: "open", outlet: "auto", expandable: false })
export const wallLength = (w: FoundationWall) => Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z)
export const openingWidth = (o: Opening) => (o.shape === "circle" ? o.diameter : o.width) / 1000
export const openingHeight = (o: Opening) => (o.shape === "circle" ? o.diameter : o.openingHeight) / 1000
export const openingArea = (o: Opening) => o.shape === "circle" ? Math.PI * (o.diameter / 2000) ** 2 : o.width * o.openingHeight / 1e6
export const freeArea = (o: Opening) => o.state === "open" && o.outlet === "auto" && o.freePercent !== null ? openingArea(o) * o.freePercent / 100 : 0
export const openingSize = (o: Opening) => o.shape === "circle" ? `Ø${o.diameter} мм` : `${o.width} × ${o.openingHeight} мм`
export function openingPoint(w: FoundationWall, offset: number): FoundationPoint {
  const t = offset / wallLength(w)
  return { x: w.start.x + (w.end.x - w.start.x) * t, z: w.start.z + (w.end.z - w.start.z) * t }
}
const EPS = 1e-7
const horizontal = (w: FoundationWall) => Math.abs(w.start.z - w.end.z) < EPS
function inside(p: FoundationPoint, vertices: FoundationPoint[]) {
  let yes = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j]
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) yes = !yes
  }
  return yes
}
function onWall(p: FoundationPoint, w: FoundationWall) {
  return horizontal(w) ? Math.abs(p.z - w.start.z) < EPS && p.x >= Math.min(w.start.x, w.end.x) - EPS && p.x <= Math.max(w.start.x, w.end.x) + EPS
    : Math.abs(p.x - w.start.x) < EPS && p.z >= Math.min(w.start.z, w.end.z) - EPS && p.z <= Math.max(w.start.z, w.end.z) + EPS
}

export function auditGeometry(p: AuditProject) {
  const geometry = getFoundationGeometry({ ...p.foundation, partitions: "none" })
  for (const [index, part] of p.partitions.entries()) {
    const coords = [...new Set(geometry.vertices.map(v => part.axis === "x" ? v.x : v.z))].sort((a, b) => a - b)
    const spans: [number, number][] = []
    for (let i = 0; i < coords.length - 1; i++) {
      const mid = (coords[i] + coords[i + 1]) / 2
      const point = part.axis === "x" ? { x: mid, z: part.position } : { x: part.position, z: mid }
      const a = part.axis === "x" ? { ...point, z: point.z - EPS } : { ...point, x: point.x - EPS }
      const b = part.axis === "x" ? { ...point, z: point.z + EPS } : { ...point, x: point.x + EPS }
      if (!inside(a, geometry.vertices) || !inside(b, geometry.vertices)) continue
      const last = spans.at(-1)
      if (last && last[1] === coords[i]) last[1] = coords[i + 1]
      else spans.push([coords[i], coords[i + 1]])
    }
    spans.forEach(([a, b], i) => geometry.walls.push({ id: `${part.id}:${i}`, label: `Перемычка ${index + 1}${spans.length > 1 ? `.${i + 1}` : ""}`, internal: true,
      start: part.axis === "x" ? { x: a, z: part.position } : { x: part.position, z: a },
      end: part.axis === "x" ? { x: b, z: part.position } : { x: part.position, z: b } }))
  }
  return geometry
}

type Cell = { x0: number; x1: number; z0: number; z1: number; room: number }
type Span = { wall: FoundationWall; from: number; to: number }
export function auditContext(p: AuditProject) {
  const geometry = auditGeometry(p)
  const xs = [...new Set(geometry.walls.flatMap(w => [w.start.x, w.end.x]))].sort((a, b) => a - b)
  const zs = [...new Set(geometry.walls.flatMap(w => [w.start.z, w.end.z]))].sort((a, b) => a - b)
  const cells: Cell[] = []
  for (let x = 0; x < xs.length - 1; x++) for (let z = 0; z < zs.length - 1; z++) {
    if (inside({ x: (xs[x] + xs[x + 1]) / 2, z: (zs[z] + zs[z + 1]) / 2 }, geometry.vertices)) cells.push({ x0: xs[x], x1: xs[x + 1], z0: zs[z], z1: zs[z + 1], room: -1 })
  }
  let rooms = 0
  for (const c of cells) {
    if (c.room >= 0) continue
    c.room = rooms++
    const queue = [c]
    for (let i = 0; i < queue.length; i++) for (const other of cells) {
      if (other.room >= 0) continue
      const curr = queue[i]
      let boundary: FoundationPoint | null = null
      if (curr.z0 === other.z0 && curr.z1 === other.z1 && (curr.x1 === other.x0 || curr.x0 === other.x1)) boundary = { x: curr.x1 === other.x0 ? curr.x1 : curr.x0, z: (curr.z0 + curr.z1) / 2 }
      if (curr.x0 === other.x0 && curr.x1 === other.x1 && (curr.z1 === other.z0 || curr.z0 === other.z1)) boundary = { x: (curr.x0 + curr.x1) / 2, z: curr.z1 === other.z0 ? curr.z1 : curr.z0 }
      if (boundary && !geometry.walls.some(w => onWall(boundary!, w))) { other.room = c.room; queue.push(other) }
    }
  }
  const roomAt = (point: FoundationPoint) => cells.find(c => point.x > c.x0 && point.x < c.x1 && point.z > c.z0 && point.z < c.z1)?.room ?? -1
  const sides = (w: FoundationWall, offset: number) => {
    const pos = openingPoint(w, offset)
    return horizontal(w) ? [roomAt({ x: pos.x, z: pos.z - 1e-5 }), roomAt({ x: pos.x, z: pos.z + 1e-5 })] : [roomAt({ x: pos.x - 1e-5, z: pos.z }), roomAt({ x: pos.x + 1e-5, z: pos.z })]
  }
  const spans: Span[] = []
  for (const w of geometry.walls) {
    const cuts = [0, wallLength(w)]
    for (const other of geometry.walls) {
      if (horizontal(other) === horizontal(w)) continue
      const point = horizontal(w) ? { x: other.start.x, z: w.start.z } : { x: w.start.x, z: other.start.z }
      if (onWall(point, w) && onWall(point, other)) cuts.push(Math.hypot(point.x - w.start.x, point.z - w.start.z))
    }
    const sorted = [...new Set(cuts)].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length - 1; i++) spans.push({ wall: w, from: sorted[i], to: sorted[i + 1] })
  }
  return { geometry, cells, rooms, sides, spans }
}
type Context = ReturnType<typeof auditContext>
function located(o: Opening, c: Context, p: AuditProject) {
  const w = c.geometry.walls.find(w => w.id === o.wallId)
  return !!w && o.offset - openingWidth(o) / 2 >= -EPS && o.offset + openingWidth(o) / 2 <= wallLength(w) + EPS && o.height - openingHeight(o) / 2 >= -EPS && o.height + openingHeight(o) / 2 <= p.foundation.height + EPS
}
const partitionFor = (wallId: string, p: AuditProject) => p.partitions
  .filter(part => wallId.startsWith(`${part.id}:`))
  .reduce<AuditProject["partitions"][number] | undefined>((best, part) => !best || part.id.length > best.id.length ? part : best, undefined)
function fits(o: Opening, all: Opening[], p: AuditProject, c: Context) {
  if (!located(o, c, p)) return false
  const span = c.spans.find(s => s.wall.id === o.wallId && o.offset > s.from && o.offset < s.to)
  if (!span) return false
  const wallThickness = partitionFor(o.wallId, p)?.thickness ?? p.foundation.thickness
  const margin = p.foundation.cornerOffset + wallThickness / 2000 + openingWidth(o) / 2
  if (o.offset < span.from + margin - EPS || o.offset > span.to - margin + EPS) return false
  if (o.height - openingHeight(o) / 2 < 0.1 - EPS || o.height + openingHeight(o) / 2 > p.foundation.height - 0.1 + EPS) return false
  if (!span.wall.internal && p.groundLevel !== null && o.height - openingHeight(o) / 2 <= p.groundLevel) return false
  if (p.blocked.some(b => b.wallId === o.wallId && o.offset + openingWidth(o) / 2 > b.from && o.offset - openingWidth(o) / 2 < b.to)) return false
  return !all.some(a => a.id !== o.id && a.wallId === o.wallId && Math.abs(a.offset - o.offset) < (openingWidth(a) + openingWidth(o)) / 2 + 0.15 - EPS && Math.abs(a.height - o.height) < (openingHeight(a) + openingHeight(o)) / 2 + 0.15 - EPS)
}

export function inspectSystem(p: AuditProject, openings = p.openings, c = auditContext(p)) {
  const issues: Issue[] = []
  const valid = openings.filter(o => located(o, c, p))
  for (const o of openings) {
    if (!valid.includes(o)) issues.push({ code: "position", level: "problem", openingId: o.id, wallId: o.wallId, text: `${o.id}: отверстие за пределами стены или потеряло привязку. Уточните положение.` })
    else if (!fits(o, openings, p, c)) issues.push({ code: "clearance", level: "note", openingId: o.id, wallId: o.wallId, text: `${o.id}: проверьте края, соседние отверстия, примыкания и запретные зоны. Модельные отступы не соблюдены.` })
    if (o.state === "unknown" || o.freePercent === null || o.outlet === "unknown") issues.push({ code: "unknown-opening", level: "unknown", openingId: o.id, wallId: o.wallId, text: `${o.id}: уточните решётку, состояние или выход отверстия. Его неизвестная площадь не включена в подтверждённую сумму.` })
    if (o.state === "closed") issues.push({ code: "closed", level: "note", openingId: o.id, wallId: o.wallId, text: `${o.id}: закрыто. Выясните причину закрытия; если его можно открыть, измените состояние и пересчитайте.` })
    if (o.outlet === "enclosed") issues.push({ code: "enclosed", level: "note", openingId: o.id, wallId: o.wallId, text: `${o.id}: выходит в закрытое пространство и не считается наружным продухом.` })
  }
  for (const part of p.partitions) if (!c.geometry.walls.some(w => w.id.startsWith(`${part.id}:`))) issues.push({ code: "partition", level: "problem", text: "Одна из перемычек находится за пределами фундамента. Уточните её положение." })
  if (new Set(p.partitions.map(part => `${part.axis}:${part.position}`)).size !== p.partitions.length) issues.push({ code: "partition", level: "problem", text: "Две перемычки совпали. Удалите лишнюю." })
  for (const b of p.blocked) {
    const w = c.geometry.walls.find(w => w.id === b.wallId)
    if (!w || b.from >= b.to || b.to > wallLength(w)) issues.push({ code: "blocked", level: "problem", text: "Уточните границы участка, где нельзя сверлить." })
  }
  const outside = valid.filter(o => !c.geometry.walls.find(w => w.id === o.wallId)!.internal)
  const active = valid.filter(o => freeArea(o) > 0 && (c.geometry.walls.find(w => w.id === o.wallId)!.internal || p.groundLevel === null || o.height - openingHeight(o) / 2 > p.groundLevel))
  const externalFreeArea = outside.filter(o => active.includes(o)).reduce((sum, o) => sum + freeArea(o), 0)
  const requiredArea = c.geometry.area / p.foundation.areaRatio
  const deficit = Math.max(0, requiredArea - externalFreeArea)
  if (deficit > EPS) issues.push({ code: "area", level: "problem", text: `По выбранному сценарию не хватает ${Math.ceil(deficit * 10000)} см² подтверждённой свободной площади наружных продухов.` })
  const reached = new Set<number>()
  const links: number[][] = []
  for (const o of active) {
    const w = c.geometry.walls.find(w => w.id === o.wallId)!
    const sides = c.sides(w, o.offset).filter(r => r >= 0)
    if (w.internal) links.push(sides)
    else sides.forEach(r => reached.add(r))
  }
  let changed = true
  while (changed) { changed = false; for (const link of links) if (link.some(r => reached.has(r))) for (const r of link) if (!reached.has(r)) { reached.add(r); changed = true } }
  const isolated = Array.from({ length: c.rooms }, (_, i) => i).filter(i => !reached.has(i))
  if (isolated.length) issues.push({ code: "isolated", level: "problem", text: `Нет подтверждённого пути наружу: ${isolated.map(i => `отсек ${i + 1}`).join(", ")}. Проверьте наружные и внутренние отверстия.` })
  const gaps: { span: Span; from: number; to: number; target: number }[] = []
  for (const span of c.spans.filter(s => !s.wall.internal)) {
    const positions = active.filter(o => o.wallId === span.wall.id && o.offset > span.from && o.offset < span.to).map(o => o.offset).sort((a, b) => a - b)
    if (!positions.length) gaps.push({ span, from: span.from, to: span.to, target: (span.from + span.to) / 2 })
    else {
      const bounds = [span.from, ...positions, span.to]
      for (let i = 0; i < bounds.length - 1; i++) {
        const edge = i === 0 || i === bounds.length - 2
        if (bounds[i + 1] - bounds[i] > p.foundation.maxSpacing / (edge ? 2 : 1) + EPS) gaps.push({ span, from: bounds[i], to: bounds[i + 1], target: (bounds[i] + bounds[i + 1]) / 2 })
      }
    }
  }
  for (const wallId of new Set(gaps.map(g => g.span.wall.id))) issues.push({ code: "spacing", level: "problem", wallId, text: `${c.geometry.walls.find(w => w.id === wallId)!.label}: есть участок без открытых продухов по принятому шагу ${p.foundation.maxSpacing} м. У края принят половинный шаг.` })
  const buried = outside.filter(o => p.groundLevel !== null && o.height - openingHeight(o) / 2 <= p.groundLevel)
  for (const o of buried) issues.push({ code: "ground", level: "problem", openingId: o.id, wallId: o.wallId, text: `${o.id}: нижний край не выше введённого уровня земли. Отверстие исключено из действующей наружной площади.` })
  if (p.groundLevel === null) issues.push({ code: "ground-unknown", level: "unknown", text: "Уровень земли не указан: доступность продухов снаружи не проверена." })
  if (!p.inventoryComplete) issues.push({ code: "inventory", level: "unknown", text: "Подтвердите, что перенесли все существующие отверстия, включая проходы в перемычках." })
  if (p.kind !== "crawlspace") issues.push({ code: "scope", level: "problem", text: p.kind === "slab" ? "Для плиты без подполья этот расчёт не подходит." : "Для этой конструкции сначала нужно уточнить способ вентиляции. Автоматическая доработка не предлагается." })
  return { issues, externalFreeArea, geometricArea: outside.reduce((sum, o) => sum + openingArea(o), 0), requiredArea, deficit, isolated, gaps, externalCount: outside.length, internalCount: valid.length - outside.length,
    meetsModel: !issues.some(i => i.level === "problem"), complete: !issues.some(i => i.level === "unknown"), rooms: c.rooms }
}

export type Proposal = { id: string; title: string; actions: Action[]; openings: Opening[]; after: ReturnType<typeof inspectSystem>; knownCost: number; costComplete: boolean; solved: boolean; limited: boolean }
const DIAMETERS = [132, 152, 162, 200, 250]
export function calculateAudit(raw: AuditProject) {
  const p = auditProjectSchema.parse(raw)
  const c = auditContext(p), before = inspectSystem(p, p.openings, c)
  const block = before.issues.some(i => ["position", "partition", "blocked", "scope"].includes(i.code))
  // Unknown opening area must be measured before irreversible changes are suggested.
  const uncertain = before.issues.some(i => ["unknown-opening", "inventory"].includes(i.code))
  const proposals: Proposal[] = []
  if (!block && !uncertain) {
    for (const strategy of ["new", "mixed"] as const) {
      if (strategy === "mixed" && !p.openings.some(o => o.expandable && o.shape === "circle")) continue
      const openings = p.openings.map(o => ({ ...o })), actions: Action[] = []
      let state = inspectSystem(p, openings, c), limited = false
      for (let iteration = 0; iteration < 100 && !state.meetsModel; iteration++) {
        const candidates: Action[] = []
        const usedIds = new Set(openings.map(o => o.id))
        const base = `new-${iteration + 1}`
        let newOpeningId = base
        if (usedIds.has(newOpeningId)) { let n = 2; while (usedIds.has(`${base}-${n}`)) n++; newOpeningId = `${base}-${n}` }
        if (strategy === "mixed" && !state.gaps.length && state.deficit > EPS && !state.isolated.length) {
          for (const o of openings.filter(o => o.expandable && o.shape === "circle" && freeArea(o) > 0 && !c.geometry.walls.find(w => w.id === o.wallId)?.internal)) {
            for (const d of DIAMETERS.filter(d => d > o.diameter)) {
              const expanded = { ...o, diameter: d }
              if (fits(expanded, openings, p, c)) candidates.push({ kind: "enlarge", before: o, opening: expanded, gain: freeArea(expanded) - freeArea(o), price: null, reason: "Увеличить наружную свободную площадь, сохранив центр отверстия." })
            }
          }
        }
        if (p.allowNew) {
          const targetSpans = state.gaps.length ? state.gaps.map(g => ({ span: g.span, target: g.target, low: g.from, high: g.to }))
            : c.spans.filter(s => !s.wall.internal || state.isolated.some(r => c.sides(s.wall, (s.from + s.to) / 2).includes(r))).map(span => ({ span, target: (span.from + span.to) / 2, low: span.from, high: span.to }))
          for (const { span, target, low, high } of targetSpans) {
            if (span.wall.internal && !state.isolated.length) continue
            const partition = partitionFor(span.wall.id, p)
            const wallThickness = partition?.thickness ?? p.foundation.thickness
            const wallMaterial = partition?.material ?? p.foundation.material
            for (const diameter of DIAMETERS) {
              const margin = p.foundation.cornerOffset + wallThickness / 2000 + diameter / 2000
              const lo = Math.max(span.from + margin, low), hi = Math.min(span.to - margin, high)
              if (hi < lo) continue
              const positions = [...new Set([Math.max(lo, Math.min(hi, target)), lo, hi, ...Array.from({ length: Math.min(160, Math.ceil((hi - lo) / 0.25)) }, (_, i) => lo + (i + 1) * 0.25).filter(x => x <= hi)])].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
              for (const offset of positions) {
                const o: Opening = { ...newOpening(span.wall.id, Number(offset.toFixed(4)), p.foundation.ventHeight, newOpeningId), diameter, freePercent: p.foundation.grilleFreePercent }
                if (!fits(o, openings, p, c)) continue
                const gain = span.wall.internal ? 0 : freeArea(o)
                candidates.push({ kind: "add", opening: o, gain, price: calculateHolePrice({ diameterMm: diameter, material: wallMaterial, depthMm: wallThickness, atHeight: false, underFloor: p.foundation.underFloor }), reason: state.gaps.length ? "Заполнить участок стены без открытых продухов." : span.wall.internal ? "Соединить отсек с соседней частью подполья." : "Добавить наружную свободную площадь и путь наружу." })
                break
              }
            }
          }
        }
        const score = (s: typeof state) => s.gaps.reduce((sum, g) => sum + (g.to - g.from), 0) * 10 + s.isolated.length * 100 + s.deficit / s.requiredArea * 10
        const baseline = score(state)
        const evaluated = candidates.map(a => {
          const next = a.kind === "add" ? [...openings, a.opening] : openings.map(o => o.id === a.opening.id ? a.opening : o)
          const after = inspectSystem(p, next, c)
          const benefit = baseline - score(after)
          return { action: a, after, benefit, rank: benefit / (a.kind === "enlarge" ? 0.1 : strategy === "new" ? (a.price ?? 3000) / 3000 : 1) }
        }).filter(x => x.benefit > EPS).sort((a, b) => b.rank - a.rank || (a.action.price ?? 0) - (b.action.price ?? 0) || a.action.opening.diameter - b.action.opening.diameter)
        const best = evaluated[0]
        if (!best) break
        const a = best.action
        if (a.kind === "add") openings.push(a.opening)
        else openings[openings.findIndex(o => o.id === a.opening.id)] = a.opening
        const oldAction = actions.findIndex(x => x.opening.id === a.opening.id)
        if (oldAction >= 0) { const original = actions[oldAction]; actions[oldAction] = { ...a, before: original.before, gain: freeArea(a.opening) - freeArea(original.before!) } }
        else actions.push(a)
        state = best.after
        if (iteration === 99 && !state.meetsModel) limited = true
      }
      const after = inspectSystem(p, openings, c)
      proposals.push({ id: strategy, title: strategy === "new" ? "Сохранить размеры старых" : "Рассмотреть расширение", actions, openings, after, knownCost: actions.reduce((sum, a) => sum + (a.price ?? 0), 0), costComplete: actions.every(a => a.price !== null), solved: after.meetsModel, limited })
    }
  }
  return { geometry: c.geometry, cells: c.cells, before, proposals, blocked: block || uncertain,
    assumptions: [`Пользовательский сценарий: свободная наружная площадь = площадь по осям стен / ${p.foundation.areaRatio}. Это не нормативное заключение.`, `Шаг ${p.foundation.maxSpacing} м, у края половина шага; отступ ${p.foundation.cornerOffset} м плюс половина толщины стены и радиус. Запас по высоте 100 мм, между отверстиями 150 мм — геометрические допущения, не проверка прочности.`, `Новые продухи: свободное сечение решётки ${p.foundation.grilleFreePercent}%. Высота центра ${p.foundation.ventHeight} м от низа цоколя.`, "Пути между отсеками показаны геометрически. Расход воздуха, достаточность внутренних проходов, скрытая арматура и несущая способность не рассчитаны. Позиции нужно проверить на объекте.", "Подбор эвристический: лучший из найденных вариантов, без гарантии минимальной цены. Стоимость включает известные работы по бурению; расширение, решётки, гильзы и отделка оцениваются отдельно."] }
}
