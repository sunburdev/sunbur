"use client"

import Konva from "konva"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva"
import { AlignHorizontalDistributeCenter, Copy, FlipHorizontal2, Grid3x3, Maximize2, Minus, MousePointer2, Plus, Redo2, Ruler, Trash2, Undo2 } from "lucide-react"
import {
  pointOnWall, ventEdgeMargin, ventMinPitch, ventViolations,
  type FoundationGeometry, type FoundationInput, type FoundationWall, type VentPlacement,
} from "@/lib/vent-calculator"
import {
  distributeEvenly, duplicateVents, mirrorAlongWall, mirrorToOppositeWall,
  nextVentId, outwardNormal, projectOntoWall, snapVentOffset, ventAt, wallDirection, wallLength,
  type SnapHint,
} from "@/lib/vent-editor"

/** Screen-space constants. Everything else is measured in metres and converted through
 *  the stage transform, so the feel of the tool stays the same at any zoom level. */
const SNAP_PIXELS = 9
const WALL_HIT_PIXELS = 20
const MIN_VENT_PIXELS = 5
const DIMENSION_OFFSET_PIXELS = 30
const MIN_SCALE = 6
const MAX_SCALE = 480
const FIT_PADDING = 64
const MAX_VENTS = 100

const MUTED = "#757971"
const LINE = "#e4e6df"
const ORANGE = "#df582c"
const WALL = "#4c5245"
const FLOOR = "#fdfaf5"
const HOLE_FILL = "#fffaf3"
const HOLE_STROKE = "#e58b50"
const INTERNAL_STROKE = "#779c9e"
const DANGER = "#c62f2f"

const metres = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",")

export type FoundationPlanCanvasProps = {
  input: FoundationInput
  geometry: FoundationGeometry
  vents: VentPlacement[]
  diameterMm: number
  requiredArea: number
  freeArea: number
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  /** Commits an edit. `coalesce` groups a burst of edits — a drag, a run of arrow
   *  keys — into a single undo step. */
  onChange: (next: VentPlacement[], coalesce?: string) => void
  /** Brackets a pointer gesture so its commits stay merged however long it lasts. */
  onGestureStart: () => void
  onGestureEnd: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

type Viewport = { scale: number; x: number; y: number }
type DragState = {
  pointerId: number
  ventId: string
  wall: FoundationWall
  startOffset: number
  startPointer: number
  /** Offsets every selected vent had when the drag began, so the whole selection
   *  travels by one shared delta instead of accumulating rounding per frame. */
  origins: Map<string, number>
}
type Band = { fromX: number; fromZ: number; toX: number; toZ: number }

/** Plan-view editor for hand-placed vents, built on Konva.
 *
 *  The stage holds world coordinates in metres — x across the plan, z down it, matching
 *  the calculator's own frame — and zoom is just the stage scale in pixels per metre.
 *  Strokes and glyphs opt out of that scale so the drawing reads the same close up and
 *  far out. Vents never leave their wall: a drag is projected onto the wall's direction
 *  and only the distance from that wall's start is ever written back. */
export function FoundationPlanCanvas({
  input, geometry, vents, diameterMm, requiredArea, freeArea,
  selectedIds, onSelectionChange, onChange, onGestureStart, onGestureEnd,
  onUndo, onRedo, canUndo, canRedo,
}: FoundationPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const drag = useRef<DragState | null>(null)
  const bandStart = useRef<{ pointerId: number; x: number; z: number } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<Viewport>({ scale: 40, x: 0, y: 0 })
  const [gridStep, setGridStep] = useState(0.05)
  const [showDimensions, setShowDimensions] = useState(true)
  const [hoveredWall, setHoveredWall] = useState<string | null>(null)
  const [snapHint, setSnapHint] = useState<(SnapHint & { wallId: string }) | null>(null)
  const [band, setBand] = useState<Band | null>(null)
  const [panning, setPanning] = useState(false)

  const margin = ventEdgeMargin(input, diameterMm)
  const minPitch = ventMinPitch(diameterMm)
  const violations = useMemo(() => ventViolations(input, geometry, vents, diameterMm), [input, geometry, vents, diameterMm])
  const selection = useMemo(() => new Set(selectedIds), [selectedIds])

  const bounds = useMemo(() => {
    const xs = geometry.vertices.map((vertex) => vertex.x)
    const zs = geometry.vertices.map((vertex) => vertex.z)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
  }, [geometry])

  const fit = useCallback(() => {
    if (!size.width || !size.height) return
    const spanX = Math.max(bounds.maxX - bounds.minX, 1)
    const spanZ = Math.max(bounds.maxZ - bounds.minZ, 1)
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
      Math.min((size.width - FIT_PADDING * 2) / spanX, (size.height - FIT_PADDING * 2) / spanZ)))
    setViewport({
      scale,
      x: (size.width - spanX * scale) / 2 - bounds.minX * scale,
      y: (size.height - spanZ * scale) / 2 - bounds.minZ * scale,
    })
  }, [bounds, size])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    // Measure once up front. ResizeObserver callbacks are delivered as part of the
    // rendering steps, so a tab that is never painted — a background tab, a hidden
    // pane — would otherwise leave the stage at zero and draw nothing at all.
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setSize((current) => {
        const width = Math.round(rect.width), height = Math.round(rect.height)
        return current.width === width && current.height === height ? current : { width, height }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // A stage that disagrees with its container by even a few pixels misplaces every
    // click, so the window resize is kept as a backstop: it still arrives in the rare
    // cases the observer's callback is delayed or coalesced away.
    window.addEventListener("resize", measure)
    return () => { observer.disconnect(); window.removeEventListener("resize", measure) }
  }, [])

  // Re-fit whenever the drawing would otherwise sit off-screen: on first measure and
  // whenever the footprint itself changes. Zoom the user set by hand is left alone.
  const fitKey = `${size.width}x${size.height}:${bounds.minX},${bounds.maxX},${bounds.minZ},${bounds.maxZ}`
  const lastFit = useRef("")
  useEffect(() => {
    if (lastFit.current === fitKey || !size.width) return
    lastFit.current = fitKey
    fit()
  }, [fitKey, fit, size.width])

  /** Pointer position in metres, or null before the first pointer event. */
  const worldPointer = useCallback(() => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return null
    const point = stage.getAbsoluteTransform().copy().invert().point(pointer)
    return { x: point.x, z: point.y }
  }, [])

  const commitSelection = useCallback((ids: string[]) => {
    onSelectionChange([...new Set(ids)])
  }, [onSelectionChange])

  function placeOnWall(wall: FoundationWall, world: { x: number; z: number }) {
    if (vents.length >= MAX_VENTS) return
    const neighbours = vents.filter((vent) => vent.wallId === wall.id).map((vent) => vent.offset)
    const { offset } = snapVentOffset(projectOntoWall(wall, world), {
      wall, neighbours, margin, gridStep, tolerance: SNAP_PIXELS / viewport.scale,
    })
    const created = ventAt(nextVentId(vents), wall, offset)
    onChange([...vents, created])
    commitSelection([created.id])
  }

  function beginDrag(event: Konva.KonvaEventObject<PointerEvent>, vent: VentPlacement, wall: FoundationWall) {
    const world = worldPointer()
    if (!world) return
    event.cancelBubble = true
    const additive = event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey
    const next = additive
      ? (selection.has(vent.id) ? selectedIds.filter((id) => id !== vent.id) : [...selectedIds, vent.id])
      : (selection.has(vent.id) ? selectedIds : [vent.id])
    commitSelection(next)
    if (additive && selection.has(vent.id)) return
    const moving = next.includes(vent.id) ? next : [vent.id]
    onGestureStart()
    drag.current = {
      pointerId: event.evt.pointerId, ventId: vent.id, wall,
      startOffset: vent.offset, startPointer: projectOntoWall(wall, world),
      origins: new Map(vents.filter((item) => moving.includes(item.id)).map((item) => [item.id, item.offset])),
    }
  }

  function continueDrag(world: { x: number; z: number }, state: DragState) {
    const raw = state.startOffset + (projectOntoWall(state.wall, world) - state.startPointer)
    const neighbours = vents
      .filter((vent) => vent.wallId === state.wall.id && !state.origins.has(vent.id))
      .map((vent) => vent.offset)
    const { offset, hint } = snapVentOffset(raw, {
      wall: state.wall, neighbours, margin, gridStep, tolerance: SNAP_PIXELS / viewport.scale,
    })
    setSnapHint(hint ? { ...hint, wallId: state.wall.id } : null)
    const delta = offset - state.startOffset
    onChange(vents.map((vent) => {
      const origin = state.origins.get(vent.id)
      if (origin === undefined) return vent
      const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
      if (!wall) return vent
      return ventAt(vent.id, wall, Math.max(0, Math.min(wallLength(wall), origin + delta)))
    }), "drag-vents")
  }

  function stagePointerDown(event: Konva.KonvaEventObject<PointerEvent>) {
    if (event.target !== event.currentTarget || panning) return
    const world = worldPointer()
    if (!world) return
    bandStart.current = { pointerId: event.evt.pointerId, ...world }
    if (!event.evt.shiftKey) commitSelection([])
  }

  function stagePointerMove(event: Konva.KonvaEventObject<PointerEvent>) {
    const world = worldPointer()
    if (!world) return
    const state = drag.current
    if (state && event.evt.pointerId === state.pointerId) { continueDrag(world, state); return }
    const start = bandStart.current
    if (start && event.evt.pointerId === start.pointerId) {
      setBand({ fromX: start.x, fromZ: start.z, toX: world.x, toZ: world.z })
    }
  }

  function stagePointerUp(event: Konva.KonvaEventObject<PointerEvent>) {
    const state = drag.current
    if (state && event.evt.pointerId === state.pointerId) {
      drag.current = null
      setSnapHint(null)
      onGestureEnd()
    }
    const start = bandStart.current
    if (start && event.evt.pointerId === start.pointerId) {
      bandStart.current = null
      if (band) {
        const low = { x: Math.min(band.fromX, band.toX), z: Math.min(band.fromZ, band.toZ) }
        const high = { x: Math.max(band.fromX, band.toX), z: Math.max(band.fromZ, band.toZ) }
        const caught = vents
          .filter((vent) => vent.x >= low.x && vent.x <= high.x && vent.z >= low.z && vent.z <= high.z)
          .map((vent) => vent.id)
        commitSelection(event.evt.shiftKey ? [...selectedIds, ...caught] : caught)
      }
      setBand(null)
    }
  }

  function zoomAt(factor: number, anchor?: { x: number; y: number }) {
    setViewport((current) => {
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor))
      const point = anchor ?? { x: size.width / 2, y: size.height / 2 }
      const world = { x: (point.x - current.x) / current.scale, z: (point.y - current.y) / current.scale }
      return { scale, x: point.x - world.x * scale, y: point.y - world.z * scale }
    })
  }

  /** Zooms on the wheel, but only once the editor is actually in use.
   *
   *  The canvas sits in the middle of a long page. Swallowing every wheel event would
   *  trap someone who is only scrolling past it, so the wheel zooms when they hold
   *  Ctrl/Cmd or have clicked into the editor, and scrolls the page otherwise. */
  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const focused = containerRef.current?.contains(document.activeElement) ?? false
    if (!focused && !event.evt.ctrlKey && !event.evt.metaKey) return
    event.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition() ?? undefined
    zoomAt(Math.exp(-event.evt.deltaY * 0.0015), pointer)
  }

  const nudge = useCallback((delta: number) => {
    if (!selectedIds.length) return
    onChange(vents.map((vent) => {
      if (!selection.has(vent.id)) return vent
      const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
      if (!wall) return vent
      return ventAt(vent.id, wall, Math.max(0, Math.min(wallLength(wall), vent.offset + delta)))
    }), "nudge-vents")
  }, [geometry, onChange, selectedIds.length, selection, vents])

  const removeSelected = useCallback(() => {
    if (!selectedIds.length) return
    onChange(vents.filter((vent) => !selection.has(vent.id)))
    commitSelection([])
  }, [commitSelection, onChange, selectedIds.length, selection, vents])

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const control = event.ctrlKey || event.metaKey
    if (control && event.key.toLowerCase() === "z") {
      event.preventDefault()
      if (event.shiftKey) onRedo(); else onUndo()
      return
    }
    if (control && event.key.toLowerCase() === "y") { event.preventDefault(); onRedo(); return }
    if (control && event.key.toLowerCase() === "a") { event.preventDefault(); commitSelection(vents.map((vent) => vent.id)); return }
    if (control && event.key.toLowerCase() === "d") { event.preventDefault(); runBulk("duplicate"); return }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); removeSelected(); return }
    if (event.key === "Escape") { event.preventDefault(); commitSelection([]); return }
    if (event.key === " ") { event.preventDefault(); setPanning(true); return }
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }
    if (!(event.key in deltas)) return
    event.preventDefault()
    nudge(deltas[event.key] * (event.shiftKey ? 0.5 : Math.max(gridStep, 0.01)))
  }

  useEffect(() => {
    const release = (event: KeyboardEvent) => { if (event.key === " ") setPanning(false) }
    window.addEventListener("keyup", release)
    return () => window.removeEventListener("keyup", release)
  }, [])

  function runBulk(operation: "distribute" | "mirror" | "flip" | "duplicate") {
    if (!selectedIds.length) return
    if (operation === "distribute") { onChange(distributeEvenly(vents, geometry, selectedIds, margin)); return }
    if (operation === "flip") { onChange(mirrorAlongWall(vents, geometry, selectedIds)); return }
    const room = MAX_VENTS - vents.length
    if (room <= 0) return
    const result = operation === "mirror"
      ? mirrorToOppositeWall(vents, geometry, selectedIds.slice(0, room))
      : duplicateVents(vents, geometry, selectedIds.slice(0, room), minPitch)
    onChange(result.vents)
    commitSelection(result.added)
  }

  const deficit = requiredArea - freeArea
  const toWorldLength = (pixels: number) => pixels / viewport.scale
  const ventRadius = Math.max(diameterMm / 2000, toWorldLength(MIN_VENT_PIXELS))

  /** Grid lines covering just the visible rectangle, at a pitch that stays readable. */
  const grid = useMemo(() => {
    if (!gridStep || !size.width || !size.height) return null
    const left = -viewport.x / viewport.scale, top = -viewport.y / viewport.scale
    const right = (size.width - viewport.x) / viewport.scale, bottom = (size.height - viewport.y) / viewport.scale
    const minor = viewport.scale * gridStep >= 7 ? gridStep : 0
    const lines: { points: number[]; major: boolean }[] = []
    const push = (step: number, major: boolean) => {
      if (!step) return
      for (let x = Math.ceil(left / step) * step; x <= right; x += step) lines.push({ points: [x, top, x, bottom], major })
      for (let z = Math.ceil(top / step) * step; z <= bottom; z += step) lines.push({ points: [left, z, right, z], major })
    }
    push(minor, false)
    push(1, true)
    return lines.length > 4000 ? null : lines
  }, [gridStep, size, viewport])

  /** One dimension chain per wall: corner, every hole in order, corner. */
  const dimensions = useMemo(() => {
    if (!showDimensions) return []
    return geometry.walls.flatMap((wall) => {
      const offsets = vents.filter((vent) => vent.wallId === wall.id).map((vent) => vent.offset).sort((a, b) => a - b)
      if (!offsets.length) return []
      const length = wallLength(wall)
      const direction = wallDirection(wall)
      const normal = outwardNormal(geometry, wall)
      const away = toWorldLength(DIMENSION_OFFSET_PIXELS)
      const stops = [0, ...offsets, length]
      const at = (offset: number) => ({
        x: wall.start.x + direction.x * offset + normal.x * away,
        z: wall.start.z + direction.z * offset + normal.z * away,
      })
      return [{
        id: wall.id,
        line: [at(0), at(length)].flatMap((point) => [point.x, point.z]),
        ticks: stops.map((offset) => {
          const base = pointOnWall(wall, offset)
          const tip = at(offset)
          return { key: `${wall.id}-${offset}`, points: [base.x, base.z, tip.x, tip.z] }
        }),
        labels: stops.slice(1).map((offset, index) => {
          const previous = stops[index]
          const middle = at((previous + offset) / 2)
          return { key: `${wall.id}-${index}`, x: middle.x, z: middle.z, text: metres(offset - previous) }
        }),
      }]
    })
  }, [geometry, showDimensions, vents, viewport.scale])

  const snapGuide = useMemo(() => {
    if (!snapHint) return null
    const wall = geometry.walls.find((candidate) => candidate.id === snapHint.wallId)
    if (!wall) return null
    const normal = outwardNormal(geometry, wall)
    const reach = toWorldLength(46)
    const at = pointOnWall(wall, snapHint.offset)
    return {
      points: [at.x - normal.x * reach, at.z - normal.z * reach, at.x + normal.x * reach, at.z + normal.z * reach],
      label: snapHint.label,
      x: at.x + normal.x * reach,
      z: at.z + normal.z * reach,
    }
  }, [geometry, snapHint, viewport.scale])

  const counterScale = 1 / viewport.scale

  return <div className="fp-editor">
    <div className="fp-toolbar">
      <div className="fp-group">
        <button type="button" className="fp-tool" title="Отменить (Ctrl+Z)" aria-label="Отменить" disabled={!canUndo} onClick={onUndo}><Undo2 size={15} /></button>
        <button type="button" className="fp-tool" title="Вернуть (Ctrl+Shift+Z)" aria-label="Вернуть" disabled={!canRedo} onClick={onRedo}><Redo2 size={15} /></button>
      </div>
      <div className="fp-group">
        <button type="button" className="fp-tool" title="Отдалить" aria-label="Отдалить" onClick={() => zoomAt(1 / 1.25)}><Minus size={15} /></button>
        <span className="fp-zoom">{Math.round(viewport.scale)} px/м</span>
        <button type="button" className="fp-tool" title="Приблизить" aria-label="Приблизить" onClick={() => zoomAt(1.25)}><Plus size={15} /></button>
        <button type="button" className="fp-tool" title="Вписать в экран" aria-label="Вписать в экран" onClick={fit}><Maximize2 size={15} /></button>
      </div>
      <div className="fp-group">
        <button type="button" className={`fp-tool ${gridStep ? "is-on" : ""}`} aria-pressed={gridStep > 0} title="Привязка к сетке" onClick={() => setGridStep(gridStep ? 0 : 0.05)}><Grid3x3 size={15} /></button>
        <div className="fp-select">
          <select aria-label="Шаг привязки" value={gridStep} onChange={(event) => setGridStep(Number(event.target.value))}>
            <option value={0}>без привязки</option>
            <option value={0.05}>шаг 5 см</option>
            <option value={0.1}>шаг 10 см</option>
            <option value={0.25}>шаг 25 см</option>
          </select>
        </div>
        <button type="button" className={`fp-tool ${showDimensions ? "is-on" : ""}`} aria-pressed={showDimensions} title="Размерные линии" onClick={() => setShowDimensions(!showDimensions)}><Ruler size={15} /></button>
      </div>
      <div className="fp-group fp-group-bulk">
        <button type="button" className="fp-action" disabled={!selectedIds.length} title="Распределить равномерно по стене" onClick={() => runBulk("distribute")}><AlignHorizontalDistributeCenter size={14} /> Равномерно</button>
        <button type="button" className="fp-action" disabled={!selectedIds.length} title="Отразить вдоль своей стены" onClick={() => runBulk("flip")}><FlipHorizontal2 size={14} /> Отразить</button>
        <button type="button" className="fp-action" disabled={!selectedIds.length} title="Скопировать на противоположную стену" onClick={() => runBulk("mirror")}><Copy size={14} /> Напротив</button>
        <button type="button" className="fp-action" disabled={!selectedIds.length} title="Дублировать (Ctrl+D)" onClick={() => runBulk("duplicate")}><Plus size={14} /> Дублировать</button>
        <button type="button" className="fp-action fp-action-danger" disabled={!selectedIds.length} title="Удалить выбранные (Delete)" onClick={removeSelected}><Trash2 size={14} /> Удалить</button>
      </div>
    </div>

    <div
      ref={containerRef}
      className={`fp-stage${panning ? " is-panning" : ""}`}
      tabIndex={0}
      role="application"
      aria-label="План фундамента. Щёлкните по стене, чтобы поставить продух; тяните отверстие вдоль стены; рамкой выделяется группа; Delete удаляет."
      onKeyDown={handleKeyDown}
      onPointerDown={() => containerRef.current?.focus({ preventScroll: true })}
      onBlur={() => setPanning(false)}
    >
      {size.width > 0 && <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.x}
        y={viewport.y}
        draggable={panning}
        onDragEnd={(event) => { if (event.target === event.currentTarget) setViewport((current) => ({ ...current, x: event.target.x(), y: event.target.y() })) }}
        onWheel={handleWheel}
        onPointerDown={stagePointerDown}
        onPointerMove={stagePointerMove}
        onPointerUp={stagePointerUp}
        onPointerCancel={stagePointerUp}
      >
        <Layer listening={false}>
          {grid?.map((entry, index) => <Line
            key={index}
            points={entry.points}
            stroke={entry.major ? "#dfe2d8" : "#eef0e9"}
            strokeWidth={1}
            strokeScaleEnabled={false}
          />)}
        </Layer>

        <Layer>
          <Line
            points={geometry.vertices.flatMap((vertex) => [vertex.x, vertex.z])}
            closed
            fill={FLOOR}
            listening={false}
          />
          {geometry.walls.map((wall) => {
            const isHovered = hoveredWall === wall.id
            return <Group
              key={wall.id}
              onPointerEnter={() => setHoveredWall(wall.id)}
              onPointerLeave={() => setHoveredWall((current) => (current === wall.id ? null : current))}
              onPointerDown={(event: Konva.KonvaEventObject<PointerEvent>) => {
                if (panning) return
                event.cancelBubble = true
                const world = worldPointer()
                if (world) placeOnWall(wall, world)
              }}
            >
              <Line
                points={[wall.start.x, wall.start.z, wall.end.x, wall.end.z]}
                stroke="transparent"
                strokeWidth={toWorldLength(WALL_HIT_PIXELS)}
                hitStrokeWidth={toWorldLength(WALL_HIT_PIXELS)}
              />
              <Line
                points={[wall.start.x, wall.start.z, wall.end.x, wall.end.z]}
                stroke={isHovered ? ORANGE : WALL}
                strokeWidth={isHovered ? 7 : 5}
                strokeScaleEnabled={false}
                lineCap="square"
                dash={wall.internal ? [8, 6] : undefined}
                listening={false}
              />
            </Group>
          })}
        </Layer>

        <Layer listening={false}>
          {dimensions.map((chain) => <Group key={chain.id}>
            <Line points={chain.line} stroke={MUTED} strokeWidth={1} strokeScaleEnabled={false} />
            {chain.ticks.map((tick) => <Line key={tick.key} points={tick.points} stroke={LINE} strokeWidth={1} strokeScaleEnabled={false} />)}
            {chain.labels.map((label) => <Group key={label.key} x={label.x} y={label.z} scaleX={counterScale} scaleY={counterScale}>
              <Rect x={-19} y={-8} width={38} height={16} fill="#ffffff" cornerRadius={3} opacity={0.88} />
              <Text x={-19} y={-5} width={38} align="center" text={label.text} fontSize={10} fontStyle="600" fill={MUTED} />
            </Group>)}
          </Group>)}
          {geometry.walls.map((wall) => {
            const middle = pointOnWall(wall, wallLength(wall) / 2)
            const normal = outwardNormal(geometry, wall)
            const away = toWorldLength(showDimensions && vents.some((vent) => vent.wallId === wall.id) ? 54 : 22)
            return <Group key={wall.id} x={middle.x + normal.x * away} y={middle.z + normal.z * away} scaleX={counterScale} scaleY={counterScale}>
              <Text x={-52} y={-6} width={104} align="center" text={wall.label} fontSize={10} fill={MUTED} />
            </Group>
          })}
        </Layer>

        <Layer>
          {vents.map((vent) => {
            const problems = violations.get(vent.id)
            const isSelected = selection.has(vent.id)
            const wall = geometry.walls.find((candidate) => candidate.id === vent.wallId)
            if (!wall) return null
            const stroke = problems ? DANGER : vent.internal ? INTERNAL_STROKE : HOLE_STROKE
            return <Group
              key={vent.id}
              onPointerDown={(event: Konva.KonvaEventObject<PointerEvent>) => { if (!panning) beginDrag(event, vent, wall) }}
            >
              <Circle x={vent.x} y={vent.z} radius={Math.max(ventRadius, toWorldLength(11))} fill="transparent" />
              {isSelected && <Circle x={vent.x} y={vent.z} radius={ventRadius} stroke={ORANGE} strokeWidth={9} strokeScaleEnabled={false} opacity={0.22} />}
              <Circle x={vent.x} y={vent.z} radius={ventRadius} fill={problems ? "#fdf1f1" : HOLE_FILL} stroke={stroke} strokeWidth={isSelected ? 3 : 1.8} strokeScaleEnabled={false} />
            </Group>
          })}
        </Layer>

        <Layer listening={false}>
          {snapGuide && <>
            <Line points={snapGuide.points} stroke={ORANGE} strokeWidth={1} strokeScaleEnabled={false} dash={[5, 4]} />
            <Group x={snapGuide.x} y={snapGuide.z} scaleX={counterScale} scaleY={counterScale}>
              <Rect x={-62} y={-9} width={124} height={18} fill={ORANGE} cornerRadius={4} />
              <Text x={-62} y={-5} width={124} align="center" text={snapGuide.label} fontSize={10} fontStyle="600" fill="#ffffff" />
            </Group>
          </>}
          {band && <Rect
            x={Math.min(band.fromX, band.toX)}
            y={Math.min(band.fromZ, band.toZ)}
            width={Math.abs(band.toX - band.fromX)}
            height={Math.abs(band.toZ - band.fromZ)}
            fill={ORANGE}
            opacity={0.08}
            stroke={ORANGE}
            strokeWidth={1}
            strokeScaleEnabled={false}
            dash={[4, 3]}
          />}
        </Layer>
      </Stage>}

      <div className="fp-hud" aria-hidden="true">
        <MousePointer2 size={12} />
        <span>{selectedIds.length ? `Выбрано: ${selectedIds.length}` : "Щёлкните по стене"}</span>
      </div>
    </div>

    <div className="fp-status" aria-live="polite">
      <span className={deficit > 1e-9 ? "fp-status-bad" : "fp-status-good"}>
        {deficit > 1e-9
          ? `Не хватает ${metres(deficit * 10000, 0)} см² до цели ${metres(requiredArea * 10000, 0)} см²`
          : `Сечение набрано: ${metres(freeArea * 10000, 0)} см² при цели ${metres(requiredArea * 10000, 0)} см²`}
      </span>
      <span className="fp-status-sep" />
      <span>Отверстий: {vents.length}</span>
      {violations.size > 0 && <><span className="fp-status-sep" /><span className="fp-status-bad">Нарушений: {violations.size}</span></>}
      <span className="fp-status-hint">Колесо — масштаб · Пробел — панорама · Ctrl+Z — отмена · Shift+клик — к выделению</span>
    </div>
  </div>
}
