"use client"

import { openingPoint, openingWidth, openingSize, wallLength, type Opening } from "@/lib/vent-audit"
import type { FoundationGeometry } from "@/lib/vent-calculator"

export function VentAuditPlan({ geometry, openings, original, selectedWall, selectedOpening, onWall, onOpening, cells }: {
  geometry: FoundationGeometry; openings: Opening[]; original: Opening[]; selectedWall: string; selectedOpening: string | null;
  onWall: (id: string) => void; onOpening: (id: string) => void;
  cells: { x0: number; x1: number; z0: number; z1: number; room: number }[];
}) {
  const maxX = Math.max(...geometry.vertices.map(p => p.x)), maxZ = Math.max(...geometry.vertices.map(p => p.z))
  const scale = Math.min(490 / maxX, 300 / maxZ)
  const left = (720 - maxX * scale) / 2, top = (470 - maxZ * scale) / 2
  const x = (v: number) => left + v * scale, y = (v: number) => top + v * scale
  return <svg className="va-plan" viewBox="0 0 720 470" role="group" aria-label="План фундамента. Выберите стену или отверстие. Расстояния по осям стен.">
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
      const select = () => onWall(w.id)
      return <g key={w.id} role="button" tabIndex={0} aria-pressed={selectedWall === w.id} aria-label={`${w.label}, ${wallLength(w).toLocaleString("ru-RU")} м. Выбрать стену`} onClick={select} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select() } }} className="va-plan-wall" data-selected={selectedWall === w.id}>
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
      const activate = () => { onWall(w.id); onOpening(o.id) }
      return <g key={o.id} className="va-plan-opening" data-status={status} data-selected={selectedOpening === o.id} role="button" tabIndex={0} aria-pressed={selectedOpening === o.id} aria-label={`${o.id}, ${openingSize(o)}, ${w.label}, ${o.offset} м от начала, ${o.state === "closed" ? "закрыто" : "продух"}`} onClick={activate} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate() } }}>
        <circle cx={x(point.x)} cy={y(point.z)} r={19} fill="transparent" />
        {o.shape === "circle" ? <circle cx={x(point.x)} cy={y(point.z)} r={radius} className="va-hole" /> : <rect x={x(point.x) - radius} y={y(point.z) - 7} width={radius * 2} height={14} rx={2} className="va-hole" />}
        {status === "enlarged" && <circle cx={x(point.x)} cy={y(point.z)} r={Math.max(4, openingWidth(old!) * scale / 2)} className="va-old-hole" />}
        {o.state !== "open" && <path d={`M${x(point.x) - 6},${y(point.z) - 6}l12,12m0,-12l-12,12`} className="va-closed-hole" />}
        <text x={x(point.x)} y={y(point.z) + 29} className="va-opening-label">{o.id.replace("new-", "Н")}</text>
      </g>
    })}
  </svg>
}
