"use client"

import { useRef, type KeyboardEvent, type PointerEvent } from "react"
import { openingPoint, openingWidth, openingSize, wallLength, type Opening } from "@/lib/vent-audit"
import type { FoundationGeometry, FoundationWall } from "@/lib/vent-calculator"

const VIEW_WIDTH = 720, VIEW_HEIGHT = 470

/** Projects a client point onto the SVG's own coordinate system, accounting for
 *  however the browser has scaled the element to fit its layout — the exact
 *  inverse of the x()/y() world-to-screen mapping this plan draws with. */
function toWorld(svg: SVGSVGElement, clientX: number, clientY: number, left: number, top: number, scale: number) {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: (local.x - left) / scale, z: (local.y - top) / scale }
}

function projectOntoWall(wall: FoundationWall, point: { x: number; z: number }) {
  const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z
  const length = Math.hypot(dx, dz) || 1
  const t = ((point.x - wall.start.x) * dx + (point.z - wall.start.z) * dz) / (length * length)
  return Math.max(0, Math.min(length, t * length))
}

export function VentAuditPlan({ geometry, openings, original, selectedWall, selectedOpening, onWall, onOpening, onPlace, onMove, onDelete, cells, disabled = false }: {
  geometry: FoundationGeometry; openings: Opening[]; original: Opening[]; selectedWall: string; selectedOpening: string | null;
  onWall: (id: string) => void; onOpening: (id: string) => void;
  onPlace?: (wallId: string, offset: number) => void; onMove?: (id: string, offset: number) => void; onDelete?: (id: string) => void;
  cells: { x0: number; x1: number; z0: number; z1: number; room: number }[]; disabled?: boolean;
}) {
  const maxX = Math.max(...geometry.vertices.map(p => p.x)), maxZ = Math.max(...geometry.vertices.map(p => p.z))
  const scale = Math.min(490 / maxX, 300 / maxZ)
  const left = (720 - maxX * scale) / 2, top = (470 - maxZ * scale) / 2
  const x = (v: number) => left + v * scale, y = (v: number) => top + v * scale
  const drag = useRef<{ pointerId: number; openingId: string; wall: FoundationWall; startOffset: number; startWorld: { x: number; z: number } } | null>(null)

  function wallClick(event: PointerEvent<SVGGElement>, w: FoundationWall) {
    const svg = event.currentTarget.ownerSVGElement
    const world = svg && toWorld(svg, event.clientX, event.clientY, left, top, scale)
    if (onPlace && !disabled && world) onPlace(w.id, projectOntoWall(w, world))
    else onWall(w.id)
  }
  function openingPointerDown(event: PointerEvent<SVGGElement>, o: Opening, w: FoundationWall) {
    onWall(w.id); onOpening(o.id)
    if (!onMove || disabled) return
    const svg = event.currentTarget.ownerSVGElement
    const world = svg && toWorld(svg, event.clientX, event.clientY, left, top, scale)
    if (!world) return
    event.stopPropagation()
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Pointer already released; the move/up handlers below still gate on a matching id. */ }
    drag.current = { pointerId: event.pointerId, openingId: o.id, wall: w, startOffset: o.offset, startWorld: world }
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId || !onMove) return
    const svg = event.currentTarget
    const world = toWorld(svg, event.clientX, event.clientY, left, top, scale)
    if (!world) return
    const dx = world.x - state.startWorld.x, dz = world.z - state.startWorld.z
    const dir = { x: (state.wall.end.x - state.wall.start.x), z: (state.wall.end.z - state.wall.start.z) }
    const len = Math.hypot(dir.x, dir.z) || 1
    const along = (dx * dir.x + dz * dir.z) / len
    const snapped = Math.round((state.startOffset + along) * 20) / 20
    onMove(state.openingId, Math.max(0, Math.min(len, snapped)))
  }
  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }
  function openingKeyDown(event: KeyboardEvent<SVGGElement>, o: Opening, w: FoundationWall) {
    if (disabled) return
    if ((event.key === "Delete" || event.key === "Backspace") && onDelete) { event.preventDefault(); onDelete(o.id); return }
    if (!onMove) return
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }
    if (!(event.key in deltas)) return
    event.preventDefault()
    const step = (event.shiftKey ? 0.5 : 0.05) * deltas[event.key]
    onMove(o.id, Math.max(0, Math.min(wallLength(w), o.offset + step)))
  }

  return <svg className="va-plan" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="group"
    aria-label={onPlace ? "План фундамента. Щёлкните по стене, чтобы поставить продух, или по отверстию, чтобы его переместить." : "План фундамента. Выберите стену или отверстие. Расстояния по осям стен."}
    onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
    <path d={`M${geometry.vertices.map(p => `${x(p.x)},${y(p.z)}`).join("L")}Z`} className="va-floor" />
    {[...new Set(cells.map(c => c.room))].map(room => {
      const cell = cells.filter(c => c.room === room).sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0))[0]
      return <text key={room} x={x((cell.x0 + cell.x1) / 2)} y={y((cell.z0 + cell.z1) / 2)} className="va-room-label">Отсек {room + 1}</text>
    })}
    {geometry.walls.map(w => {
      const horizontal = Math.abs(w.start.z - w.end.z) < 0.001
      const midX = (w.start.x + w.end.x) / 2, midZ = (w.start.z + w.end.z) / 2
      const dx = horizontal ? 0 : midX < maxX / 2 ? -48 : 48
      const dy = horizontal ? midZ < maxZ / 2 ? -28 : 35 : 0
      return <g key={w.id} role="button" tabIndex={0} aria-pressed={selectedWall === w.id} aria-label={`${w.label}, ${wallLength(w).toLocaleString("ru-RU")} м. ${onPlace ? "Поставить продух" : "Выбрать стену"}`} onPointerDown={e => wallClick(e, w)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlace && !disabled ? onPlace(w.id, wallLength(w) / 2) : onWall(w.id) } }} className="va-plan-wall" data-selected={selectedWall === w.id} data-placeable={!!onPlace}>
        <line x1={x(w.start.x)} y1={y(w.start.z)} x2={x(w.end.x)} y2={y(w.end.z)} className="va-wall-hit" />
        <line x1={x(w.start.x)} y1={y(w.start.z)} x2={x(w.end.x)} y2={y(w.end.z)} className="va-wall-line" />
        <text x={x(midX) + (w.internal ? 12 : dx)} y={y(midZ) + (w.internal ? -15 : dy)} className="va-wall-label">{w.label}</text>
        {!w.internal && <text x={x(midX) + dx} y={y(midZ) + dy + 17} className="va-wall-size">{Number(wallLength(w).toFixed(2)).toLocaleString("ru-RU")} м</text>}
        {selectedWall === w.id && <g><circle cx={x(w.start.x)} cy={y(w.start.z)} r={6} className="va-origin" /><text x={x(w.start.x) + 12} y={y(w.start.z) - 12} className="va-origin-label">Начало · 0 м</text></g>}
      </g>
    })}
    {openings.map(o => {
      const w = geometry.walls.find(w => w.id === o.wallId)
      if (!w || o.offset > wallLength(w)) return null
      const point = openingPoint(w, o.offset), old = original.find(a => a.id === o.id)
      const status = !old ? "new" : openingWidth(old) !== openingWidth(o) ? "enlarged" : "existing"
      const radius = Math.max(8, openingWidth(o) * scale / 2)
      return <g key={o.id} className="va-plan-opening" data-status={status} data-selected={selectedOpening === o.id} data-movable={!!onMove} role="button" tabIndex={0} aria-pressed={selectedOpening === o.id} aria-label={`${o.id}, ${openingSize(o)}, ${w.label}, ${o.offset} м от начала, ${o.state === "closed" ? "закрыто" : "продух"}`} onPointerDown={e => openingPointerDown(e, o, w)} onKeyDown={e => openingKeyDown(e, o, w)}>
        <circle cx={x(point.x)} cy={y(point.z)} r={19} fill="transparent" />
        {o.shape === "circle" ? <circle cx={x(point.x)} cy={y(point.z)} r={radius} className="va-hole" /> : <rect x={x(point.x) - radius} y={y(point.z) - 7} width={radius * 2} height={14} rx={2} className="va-hole" />}
        {status === "enlarged" && <circle cx={x(point.x)} cy={y(point.z)} r={Math.max(4, openingWidth(old!) * scale / 2)} className="va-old-hole" />}
        {o.state !== "open" && <path d={`M${x(point.x) - 6},${y(point.z) - 6}l12,12m0,-12l-12,12`} className="va-closed-hole" />}
        <text x={x(point.x)} y={y(point.z) + 29} className="va-opening-label">{o.id.replace("new-", "Н")}</text>
      </g>
    })}
  </svg>
}
