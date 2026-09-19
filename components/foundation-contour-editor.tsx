"use client"

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { Plus, Trash2 } from "lucide-react"
import { dragContourWall, foundationInputSchema, templateContour, validateContour, walkContour, type ContourStep, type FoundationInput } from "@/lib/vent-calculator"

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
const nextStepId = (steps: ContourStep[]) => { let n = 1; while (steps.some(s => s.id === `c${n}`)) n++; return `c${n}` }
const templates = [{ id: "t", label: "Т-образный" }, { id: "cross", label: "Крестом" }] as const

const CANVAS_WIDTH = 560, CANVAS_HEIGHT = 320, PADDING = 34

/** Draggable SVG sketch of the contour. Each wall gets a handle at its midpoint;
 *  dragging it (or nudging with arrow keys while focused) resizes only that one
 *  wall — the same edit the numeric field below makes, just driven by the mouse. */
function ContourCanvas({ contour, onChange, disabled }: { contour: ContourStep[]; onChange: (next: ContourStep[]) => void; disabled: boolean }) {
  const { vertices } = walkContour(contour)
  const minX = Math.min(...vertices.map(v => v.x)), maxX = Math.max(...vertices.map(v => v.x))
  const minZ = Math.min(...vertices.map(v => v.z)), maxZ = Math.max(...vertices.map(v => v.z))
  const spanX = Math.max(maxX - minX, 1), spanZ = Math.max(maxZ - minZ, 1)
  const scale = Math.min((CANVAS_WIDTH - PADDING * 2) / spanX, (CANVAS_HEIGHT - PADDING * 2) / spanZ)
  const originX = (CANVAS_WIDTH - spanX * scale) / 2 - minX * scale
  const originZ = (CANVAS_HEIGHT - spanZ * scale) / 2 - minZ * scale
  const toScreen = (p: { x: number; z: number }) => ({ x: originX + p.x * scale, y: originZ + p.z * scale })
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ pointerId: number; wallIndex: number; startX: number; startY: number; startContour: ContourStep[] } | null>(null)

  /** Captures the pointer and records the wall and contour at drag start. */
  function handlePointerDown(event: PointerEvent<SVGGElement>, index: number) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, wallIndex: index, startX: event.clientX, startY: event.clientY, startContour: contour }
  }
  /** Projects pointer movement into contour coordinates and resizes the active wall. */
  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    // The SVG is scaled by CSS (width: 100%) to whatever the layout gives it, which
    // is usually smaller than its 560x320 viewBox — convert client pixels to
    // viewBox units before dividing by `scale` (viewBox units per metre).
    const box = svgRef.current?.getBoundingClientRect()
    const toViewBoxX = box ? CANVAS_WIDTH / box.width : 1, toViewBoxY = box ? CANVAS_HEIGHT / box.height : 1
    const dx = (event.clientX - state.startX) * toViewBoxX / scale, dz = (event.clientY - state.startY) * toViewBoxY / scale
    onChange(dragContourWall(state.startContour, state.wallIndex, dx, dz))
  }
  /** Clears drag state when the active pointer is released or cancelled. */
  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }
  /** Nudges the focused wall length with arrow keys, using Shift for metre steps. */
  function handleKeyDown(event: KeyboardEvent<SVGGElement>, index: number) {
    if (disabled) return
    if (event.key !== "ArrowUp" && event.key !== "ArrowRight" && event.key !== "ArrowDown" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const grow = event.key === "ArrowUp" || event.key === "ArrowRight"
    const delta = (event.shiftKey ? 1 : 0.1) * (grow ? 1 : -1)
    const newLength = Math.max(0.3, Math.round((contour[index].length + delta) * 10) / 10)
    onChange(contour.map((step, i) => i === index ? { ...step, length: newLength } : step))
  }

  return <svg ref={svgRef} className={`fc-canvas${disabled ? " is-disabled" : ""}`} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} role="group"
    aria-label="Схема контура. Перетащите стену мышью или выберите её и используйте стрелки, чтобы изменить её длину."
    onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
    <polygon points={vertices.map(v => { const s = toScreen(v); return `${s.x},${s.y}` }).join(" ")} className="fc-canvas-shape" />
    {contour.map((step, i) => {
      const a = toScreen(vertices[i]), b = toScreen(vertices[(i + 1) % vertices.length])
      return <line key={step.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="fc-canvas-wall" />
    })}
    {contour.map((step, i) => {
      const a = toScreen(vertices[i]), b = toScreen(vertices[(i + 1) % vertices.length])
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      return <g key={step.id} className="fc-canvas-handle" tabIndex={disabled ? -1 : 0} role="button"
        aria-label={`Стена ${i + 1}, ${fmt(step.length)} м. Перетащите или используйте стрелки, чтобы изменить длину.`}
        onPointerDown={event => handlePointerDown(event, i)} onKeyDown={event => handleKeyDown(event, i)}>
        <rect x={mid.x - 22} y={mid.y - 11} width={44} height={22} rx={6} />
        <text x={mid.x} y={mid.y + 4} textAnchor="middle">{fmt(step.length)}</text>
      </g>
    })}
  </svg>
}

/** Rectilinear perimeter editor shared by the constructor and the audit wizard.
 *  Both pages render this inside the `.vent-studio` scope, so it only relies on
 *  the `.fc-*` classes declared once in studio.css. */
export function ContourEditor({ input, contour, onChange, disabled = false }: { input: FoundationInput; contour: ContourStep[]; onChange: (next: ContourStep[]) => void; disabled?: boolean }) {
  const validation = validateContour(contour)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const applyTemplate = (kind: "t" | "cross") => {
    const xs = validation.vertices.map(v => v.x), zs = validation.vertices.map(v => v.z)
    const length = Math.max(...xs) - Math.min(...xs) || 10, width = Math.max(...zs) - Math.min(...zs) || 8
    const next = templateContour(kind, length, width)
    const parsed = foundationInputSchema.safeParse({ ...input, shape: "custom", length, width, contour: next })
    if (!parsed.success) {
      setTemplateError(`Шаблон не применён: ${parsed.error.issues.map(issue => issue.message).join(" ")}`)
      return
    }
    setTemplateError(null)
    onChange(next)
  }
  return <div className="fc-contour">
    <p className="fc-contour-hint">Перетащите стену на схеме, чтобы изменить её длину, или обходите дом по периметру ниже: начиная от любого угла и всё время в одну сторону, укажите длину каждой стены и куда дальше сворачивает дом — влево или вправо от направления движения.</p>
    <div className="fc-contour-templates"><span>Частая форма:</span>{templates.map(t => <button type="button" key={t.id} disabled={disabled} onClick={() => applyTemplate(t.id)}>{t.label}</button>)}</div>
    <ContourCanvas contour={contour} onChange={onChange} disabled={disabled} />
    <div className="fc-contour-list">
      {contour.map((step, i) => <div className="fc-contour-row" key={step.id}>
        <span className="fc-contour-index">{i + 1}</span>
        <div className="fc-contour-length"><input type="number" inputMode="decimal" min={0.3} max={40} step={0.1} disabled={disabled} aria-label={`Длина стены ${i + 1}, м`} value={step.length} onChange={e => { const length = e.target.valueAsNumber; if (Number.isFinite(length)) onChange(contour.map(s => s.id === step.id ? { ...s, length } : s)) }} /><span>м</span></div>
        <select aria-label={`Поворот после стены ${i + 1}`} value={step.turn} disabled={disabled} onChange={e => onChange(contour.map(s => s.id === step.id ? { ...s, turn: e.target.value as ContourStep["turn"] } : s))}>
          <option value="right">Дальше вправо</option>
          <option value="left">Дальше влево</option>
        </select>
        <button type="button" className="fc-contour-remove" disabled={disabled || contour.length <= 4} aria-label={`Удалить стену ${i + 1}`} onClick={() => onChange(contour.filter(s => s.id !== step.id))}><Trash2 size={14} /></button>
      </div>)}
    </div>
    <button type="button" className="fc-contour-add" disabled={disabled || contour.length >= 32} onClick={() => onChange([...contour, { id: nextStepId(contour), length: 1, turn: "right" }])}><Plus size={14} />Добавить стену</button>
    <p className={`fc-contour-status ${validation.valid ? "is-closed" : "is-open"}`}>
      {validation.valid ? "Контур замкнут — можно продолжать." : !validation.closed ? `Контур пока не замкнут: не совпадает конец, разница по X ${fmt(validation.gap.x)} м, по Z ${fmt(validation.gap.z)} м. Поправьте длины стен или повороты.` : "Контур самопересекается — проверьте длины стен и повороты."}
    </p>
    {templateError && <p className="fc-contour-status is-open" role="alert">{templateError}</p>}
  </div>
}
