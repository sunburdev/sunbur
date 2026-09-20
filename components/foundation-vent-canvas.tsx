"use client"

import { useRef, type KeyboardEvent, type PointerEvent } from "react"
import { pointOnWall, type FoundationGeometry, type FoundationWall, type VentPlacement } from "@/lib/vent-calculator"

const VIEW_WIDTH = 720, VIEW_HEIGHT = 470

/** Converts a client-space pointer position into foundation-plan coordinates. */
function toWorld(svg: SVGSVGElement, clientX: number, clientY: number, left: number, top: number, scale: number) {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: (local.x - left) / scale, z: (local.y - top) / scale }
}

/** Returns the clamped distance from a wall's start to a projected plan point. */
function projectOntoWall(wall: FoundationWall, point: { x: number; z: number }) {
  const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z
  const length = Math.hypot(dx, dz) || 1
  const t = ((point.x - wall.start.x) * dx + (point.z - wall.start.z) * dz) / (length * length)
  return Math.max(0, Math.min(length, t * length))
}

/** Click-to-place, drag-to-move plan for the constructor's manual placement mode.
 *  Structurally mirrors VentAuditPlan's interaction model, on the simpler
 *  VentPlacement shape (no state/shape/outlet — every manual vent is just a hole). */
export function FoundationVentCanvas({ geometry, vents, diameterMm, selectedId, onSelect, onPlace, onMove, onDelete, disabled = false }: {
  geometry: FoundationGeometry; vents: VentPlacement[]; diameterMm: number; selectedId: string | null;
  onSelect: (id: string | null) => void; onPlace: (wallId: string, offset: number) => void;
  onMove: (id: string, offset: number) => void; onDelete: (id: string) => void; disabled?: boolean;
}) {
  const maxX = Math.max(...geometry.vertices.map(p => p.x)), maxZ = Math.max(...geometry.vertices.map(p => p.z))
  const scale = Math.min(490 / maxX, 300 / maxZ)
  const left = (VIEW_WIDTH - maxX * scale) / 2, top = (VIEW_HEIGHT - maxZ * scale) / 2
  const x = (v: number) => left + v * scale, y = (v: number) => top + v * scale
  const radius = Math.max(8, (diameterMm / 1000) * scale / 2)
  const drag = useRef<{ pointerId: number; ventId: string; wall: FoundationWall; startOffset: number; startWorld: { x: number; z: number } } | null>(null)

  /** Places a vent at the pointer's projected position on the selected wall. */
  function wallClick(event: PointerEvent<SVGGElement>, w: FoundationWall) {
    if (disabled) return
    const svg = event.currentTarget.ownerSVGElement
    const world = svg && toWorld(svg, event.clientX, event.clientY, left, top, scale)
    if (world) onPlace(w.id, projectOntoWall(w, world))
  }

  /** Selects a vent and captures the initial state for a drag operation. */
  function ventPointerDown(event: PointerEvent<SVGGElement>, v: VentPlacement, w: FoundationWall) {
    onSelect(v.id)
    if (disabled) return
    const svg = event.currentTarget.ownerSVGElement
    const world = svg && toWorld(svg, event.clientX, event.clientY, left, top, scale)
    if (!world) return
    event.stopPropagation()
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Pointer already released; move/up still gate on a matching id. */ }
    drag.current = { pointerId: event.pointerId, ventId: v.id, wall: w, startOffset: v.offset, startWorld: world }
  }

  /** Moves the active vent along its wall in five-centimetre increments. */
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    const world = toWorld(event.currentTarget, event.clientX, event.clientY, left, top, scale)
    if (!world) return
    const dx = world.x - state.startWorld.x, dz = world.z - state.startWorld.z
    const dir = { x: state.wall.end.x - state.wall.start.x, z: state.wall.end.z - state.wall.start.z }
    const len = Math.hypot(dir.x, dir.z) || 1
    const along = (dx * dir.x + dz * dir.z) / len
    const snapped = Math.round((state.startOffset + along) * 20) / 20
    onMove(state.ventId, Math.max(0, Math.min(len, snapped)))
  }

  /** Clears drag state when the captured pointer ends or is cancelled. */
  function endDrag(event: PointerEvent<SVGSVGElement>) { if (drag.current?.pointerId === event.pointerId) drag.current = null }

  /** Handles keyboard deletion and precise movement for a focused vent. */
  function ventKeyDown(event: KeyboardEvent<SVGGElement>, v: VentPlacement, w: FoundationWall) {
    if (disabled) return
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onDelete(v.id); return }
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }
    if (!(event.key in deltas)) return
    event.preventDefault()
    const wallLength = Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z)
    const step = (event.shiftKey ? 0.5 : 0.05) * deltas[event.key]
    onMove(v.id, Math.max(0, Math.min(wallLength, v.offset + step)))
  }

  return <svg className="fv-plan" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="group"
    aria-label={disabled ? "План фундамента." : "План фундамента. Щёлкните по стене, чтобы поставить продух, или по отверстию, чтобы его переместить."}
    onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
    <path d={`M${geometry.vertices.map(p => `${x(p.x)},${y(p.z)}`).join("L")}Z`} className="fv-plan-floor" />
    {geometry.walls.map(w => {
      const horizontal = Math.abs(w.start.z - w.end.z) < 0.001
      const midX = (w.start.x + w.end.x) / 2, midZ = (w.start.z + w.end.z) / 2
      const dx = horizontal ? 0 : midX < maxX / 2 ? -48 : 48
      const dy = horizontal ? midZ < maxZ / 2 ? -20 : 30 : 0
      return <g key={w.id} role="button" tabIndex={0} aria-label={`${w.label}. ${disabled ? "" : "Поставить продух"}`} data-placeable={!disabled} className="fv-plan-wall" onPointerDown={e => wallClick(e, w)} onKeyDown={e => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPlace(w.id, Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z) / 2) } }}>
        <line x1={x(w.start.x)} y1={y(w.start.z)} x2={x(w.end.x)} y2={y(w.end.z)} className="fv-plan-wall-hit" />
        <line x1={x(w.start.x)} y1={y(w.start.z)} x2={x(w.end.x)} y2={y(w.end.z)} className="fv-plan-wall-line" />
        <text x={x(midX) + dx} y={y(midZ) + dy} className="fv-plan-wall-label">{w.label}</text>
      </g>
    })}
    {vents.map(v => {
      const w = geometry.walls.find(wall => wall.id === v.wallId)
      if (!w) return null
      const point = pointOnWall(w, v.offset)
      return <g key={v.id} className="fv-plan-vent" data-selected={selectedId === v.id} data-internal={v.internal} role="button" tabIndex={0}
        aria-label={`Продух Ø${diameterMm} мм, ${w.label}, ${v.offset.toFixed(2)} м от начала.${disabled ? "" : " Перетащите или используйте стрелки, чтобы переместить; Delete удаляет."}`}
        onPointerDown={e => ventPointerDown(e, v, w)} onKeyDown={e => ventKeyDown(e, v, w)}>
        <circle cx={x(point.x)} cy={y(point.z)} r={19} fill="transparent" />
        <circle cx={x(point.x)} cy={y(point.z)} r={radius} className="fv-plan-hole" />
      </g>
    })}
  </svg>
}
