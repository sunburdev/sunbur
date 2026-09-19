"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { FoundationGeometry, FoundationInput, VentVariant } from "@/lib/vent-calculator";

type Point = { x: number; z: number };
type SpacePoint = Point & { y: number };
type ScreenPoint = { x: number; y: number; depth: number };
type Wall = FoundationGeometry["walls"][number];
type Face = {
  key: string;
  wall: Wall;
  corners: SpacePoint[];
  normal?: Point;
  side: "top" | "front" | "back" | "end";
  depth: number;
};

export type FoundationViewProps = {
  input: FoundationInput;
  geometry: FoundationGeometry;
  variant: VentVariant | null;
  selectedWall: string | null;
  onSelectWall: (id: string | null) => void;
  showAirflow: boolean;
  view: "3d" | "plan";
};

const INITIAL_YAW = -0.62;
const INITIAL_ELEVATION = 0.6;
const SVG_WIDTH = 960;
const SVG_HEIGHT = 650;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatMetres = (value: number) => `${Number(value.toFixed(2)).toLocaleString("ru-RU")} м`;
const pointsString = (points: ScreenPoint[]) => points.map((point) => `${point.x},${point.y}`).join(" ");
const polygonPath = (points: ScreenPoint[]) => `M ${points.map((point) => `${point.x},${point.y}`).join(" L ")} Z`;

/** Orthographic model: x follows the foundation length, z its width; y is height above ground. */
export function FoundationView({
  input,
  geometry,
  variant,
  selectedWall,
  onSelectWall,
  showAirflow,
  view,
}: FoundationViewProps) {
  const uniqueId = useId().replaceAll(":", "");
  const [yaw, setYaw] = useState(INITIAL_YAW);
  const [elevation, setElevation] = useState(INITIAL_ELEVATION);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; yaw: number; elevation: number; moved: boolean; wallId: string | null } | null>(null);

  const isPlan = view === "plan";
  const thickness = input.thickness / 1000;
  const maxX = Math.max(...geometry.vertices.map((vertex) => vertex.x), input.length);
  const maxZ = Math.max(...geometry.vertices.map((vertex) => vertex.z), input.width);
  const minX = Math.min(...geometry.vertices.map((vertex) => vertex.x), 0);
  const minZ = Math.min(...geometry.vertices.map((vertex) => vertex.z), 0);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);

  const rawProjection = ({ x, y, z }: SpacePoint): ScreenPoint => {
    const dx = x - centerX;
    const dz = z - centerZ;
    if (isPlan) return { x: dx, y: dz, depth: y };
    const distance = dx * sine + dz * cosine;
    return {
      x: dx * cosine - dz * sine,
      y: distance * Math.sin(elevation) - y * Math.cos(elevation),
      depth: distance * Math.cos(elevation) + y * Math.sin(elevation),
    };
  };

  // Use a stable bounding box while rotating, so manipulating the camera never changes its scale.
  const diagonal = Math.hypot(maxX - minX, maxZ - minZ);
  const baseScale = isPlan
    ? Math.min(680 / Math.max(maxX - minX, 1), 425 / Math.max(maxZ - minZ, 1))
    : Math.min(710 / Math.max(diagonal, 1), 430 / Math.max(diagonal * 0.7 + input.height, 1));
  const scale = baseScale * zoom;
  const project = (point: SpacePoint): ScreenPoint => {
    const raw = rawProjection(point);
    return { x: SVG_WIDTH / 2 + raw.x * scale, y: 322 + raw.y * scale, depth: raw.depth };
  };
  const ground = (point: Point) => project({ ...point, y: 0 });
  const contourWinding = Math.sign(geometry.vertices.reduce((sum, point, index) => {
    const next = geometry.vertices[(index + 1) % geometry.vertices.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0));

  const wallCorners = (wall: Wall) => {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const length = Math.max(Math.hypot(dx, dz), 0.01);
    const normal = { x: -dz / length, z: dx / length };
    const half = thickness / 2;
    return {
      normal,
      tangent: { x: dx / length, z: dz / length },
      corners: [
        { x: wall.start.x + normal.x * half, z: wall.start.z + normal.z * half },
        { x: wall.end.x + normal.x * half, z: wall.end.z + normal.z * half },
        { x: wall.end.x - normal.x * half, z: wall.end.z - normal.z * half },
        { x: wall.start.x - normal.x * half, z: wall.start.z - normal.z * half },
      ],
    };
  };

  const faces: Face[] = geometry.walls.flatMap((wall) => {
    const { corners, normal } = wallCorners(wall);
    const bottom = corners.map((corner) => ({ ...corner, y: 0 }));
    const top = corners.map((corner) => ({ ...corner, y: input.height }));
    const faceData: Omit<Face, "depth">[] = [
      { key: `${wall.id}-top`, wall, corners: top, side: "top" },
      { key: `${wall.id}-front`, wall, corners: [bottom[0], bottom[1], top[1], top[0]], side: "front", normal },
      { key: `${wall.id}-back`, wall, corners: [bottom[2], bottom[3], top[3], top[2]], side: "back", normal: { x: -normal.x, z: -normal.z } },
      { key: `${wall.id}-end-a`, wall, corners: [bottom[3], bottom[0], top[0], top[3]], side: "end" },
      { key: `${wall.id}-end-b`, wall, corners: [bottom[1], bottom[2], top[2], top[1]], side: "end" },
    ];
    return faceData.map((face) => ({ ...face, depth: face.corners.reduce((sum, point) => sum + rawProjection(point).depth, 0) / face.corners.length }));
  }).sort((left, right) => left.depth - right.depth);

  const reset = () => {
    setYaw(INITIAL_YAW);
    setElevation(INITIAL_ELEVATION);
    setZoom(1);
  };

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    const target = event.target as Element;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw,
      elevation,
      moved: false,
      wallId: target.closest("[data-wall]")?.getAttribute("data-wall") ?? null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) {
      state.moved = true;
      if (!isPlan) {
        setDragging(true);
        setYaw(state.yaw + dx * 0.007);
        setElevation(clamp(state.elevation + dy * 0.004, 0.25, 1.15));
      }
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    if (!state.moved) onSelectWall(state.wallId === selectedWall ? null : state.wallId);
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || event.pointerId !== drag.current.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowLeft" && !isPlan) setYaw((value) => value - 0.15);
    else if (event.key === "ArrowRight" && !isPlan) setYaw((value) => value + 0.15);
    else if (event.key === "ArrowUp" && !isPlan) setElevation((value) => clamp(value + 0.08, 0.25, 1.15));
    else if (event.key === "ArrowDown" && !isPlan) setElevation((value) => clamp(value - 0.08, 0.25, 1.15));
    else if (event.key === "+" || event.key === "=") setZoom((value) => clamp(value + 0.15, 0.65, 1.6));
    else if (event.key === "-") setZoom((value) => clamp(value - 0.15, 0.65, 1.6));
    else if (event.key === "Home") reset();
    else if (event.key === "Escape") onSelectWall(null);
    else return;
    event.preventDefault();
  }

  const selectWithKeyboard = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onSelectWall(id === selectedWall ? null : id);
    }
  };

  const ventsFor = (wallId: string) => variant?.vents.filter((vent) => vent.wallId === wallId) ?? [];
  const wallDescription = (wall: Wall) => `${wall.label}, ${formatMetres(Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z))}, продухов: ${ventsFor(wall.id).length}. Выбрать стену.`;
  const dimension = (a: Point, b: Point, label: string, key: string) => {
    const start = ground(a);
    const end = ground(b);
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.max(Math.hypot(dx, dy), 0.1);
    const tick = { x: (-dy / length) * 5, y: (dx / length) * 5 };
    return (
      <g key={key} className="fv-dimension" aria-hidden="true">
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        {[start, end].map((point, index) => <line key={index} x1={point.x - tick.x} y1={point.y - tick.y} x2={point.x + tick.x} y2={point.y + tick.y} />)}
        <rect x={middle.x - 33} y={middle.y - 12} width="66" height="24" rx="7" />
        <text x={middle.x} y={middle.y + 4} textAnchor="middle">{label}</text>
      </g>
    );
  };

  return (
    <div className={`foundation-viewport${dragging ? " fv-dragging" : ""}`}>
      <div className="fv-top-note" aria-hidden="true"><span className="fv-status-dot" />{isPlan ? "ВИД СВЕРХУ" : "ПРОСТРАНСТВЕННАЯ МОДЕЛЬ"}</div>
      <svg
        className="fv-canvas"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        aria-label="Интерактивная модель фундамента. Стрелки поворачивают модель, плюс и минус меняют масштаб, Home сбрасывает вид. Нажмите Tab для выбора стены."
        role="group"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyboard}
      >
        <defs>
          <filter id={`${uniqueId}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="13" /></filter>
          <pattern id={`${uniqueId}-concrete`} width="19" height="23" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="7" r="0.6" fill="#817e77" opacity="0.2" />
            <circle cx="14" cy="18" r="0.4" fill="#817e77" opacity="0.2" />
          </pattern>
          <marker id={`${uniqueId}-arrow`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M1 1 L5.5 3.5 L1 6" fill="none" stroke="#58a3b7" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></marker>
        </defs>

        <g className="fv-grid" aria-hidden="true">
          {Array.from({ length: Math.ceil(maxX - minX) + 9 }, (_, index) => {
            const x = minX - 4 + index;
            const from = ground({ x, z: minZ - 4 });
            const to = ground({ x, z: maxZ + 4 });
            return <line key={`x-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
          {Array.from({ length: Math.ceil(maxZ - minZ) + 9 }, (_, index) => {
            const z = minZ - 4 + index;
            const from = ground({ x: minX - 4, z });
            const to = ground({ x: maxX + 4, z });
            return <line key={`z-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
        </g>

        <polygon points={pointsString(geometry.vertices.map((point) => ground(point)))} fill="#6b6257" opacity="0.13" filter={`url(#${uniqueId}-shadow)`} transform="translate(0 15)" aria-hidden="true" />
        <polygon points={pointsString(geometry.vertices.map((point) => ground(point)))} fill="#ebe9e3" fillOpacity="0.92" stroke="#d9d6ce" strokeWidth="1" aria-hidden="true" />

        {isPlan ? geometry.walls.map((wall) => {
          const { corners, normal, tangent } = wallCorners(wall);
          const selected = selectedWall === wall.id;
          return (
            <g key={wall.id} data-wall={wall.id} className="fv-wall" role="button" tabIndex={0} aria-label={wallDescription(wall)} aria-pressed={selected} onKeyDown={(event) => selectWithKeyboard(event, wall.id)}>
              <polygon points={pointsString(corners.map((point) => ground(point)))} fill={selected ? "#f4cfb4" : "#c7c5bc"} stroke={selected ? "#dd763d" : "#a6a499"} strokeWidth={selected ? 2 : 1} />
              {ventsFor(wall.id).map((vent) => {
                const radius = (variant?.diameterMm ?? 160) / 2000;
                const ventCorners = [
                  { x: vent.x - tangent.x * radius + normal.x * thickness * 0.65, z: vent.z - tangent.z * radius + normal.z * thickness * 0.65 },
                  { x: vent.x + tangent.x * radius + normal.x * thickness * 0.65, z: vent.z + tangent.z * radius + normal.z * thickness * 0.65 },
                  { x: vent.x + tangent.x * radius - normal.x * thickness * 0.65, z: vent.z + tangent.z * radius - normal.z * thickness * 0.65 },
                  { x: vent.x - tangent.x * radius - normal.x * thickness * 0.65, z: vent.z - tangent.z * radius - normal.z * thickness * 0.65 },
                ];
                return <polygon key={vent.id} points={pointsString(ventCorners.map((point) => ground(point)))} fill="#fffaf3" stroke={vent.internal ? "#779c9e" : "#e58b50"} strokeWidth="1.8"><title>{`Продух Ø ${variant?.diameterMm} мм · ${wall.label} · ${formatMetres(vent.offset)} от начала стены`}</title></polygon>;
              })}
            </g>
          );
        }) : faces.map((face) => {
          const selected = selectedWall === face.wall.id;
          const light = face.normal ? face.normal.x * -0.4 + face.normal.z * -0.6 : 0;
          const fill = selected
            ? face.side === "top" ? "#f6d2b8" : light > 0 ? "#e7b691" : "#dba783"
            : face.side === "top" ? "#deded6" : face.side === "end" ? "#a9aba2" : light > 0 ? "#c6c8bf" : "#b5b8ae";
          const projectedCorners = face.corners.map(project);
          const { tangent } = wallCorners(face.wall);
          const holes = face.normal ? ventsFor(face.wall.id).map((vent) => {
            const radius = (variant?.diameterMm ?? 160) / 2000;
            const normal = face.normal!;
            const center = { x: vent.x + normal.x * thickness / 2, z: vent.z + normal.z * thickness / 2, y: input.ventHeight };
            const outline = Array.from({ length: 28 }, (_, index) => {
              const angle = index / 28 * Math.PI * 2;
              return project({ x: center.x + tangent.x * Math.cos(angle) * radius, z: center.z + tangent.z * Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
            });
            return { vent, outline, center: project(center) };
          }) : [];
          const facePath = polygonPath(projectedCorners);
          return (
            <g key={face.key} data-wall={face.wall.id} className="fv-wall" role={face.side === "top" ? "button" : undefined} tabIndex={face.side === "top" ? 0 : undefined} aria-label={face.side === "top" ? wallDescription(face.wall) : undefined} aria-pressed={face.side === "top" ? selected : undefined} onKeyDown={(event) => selectWithKeyboard(event, face.wall.id)}>
              {holes.map(({ vent, outline }) => <path key={`${vent.id}-bore`} d={polygonPath(outline)} fill="#565e58" stroke="#565e58" strokeWidth="0.6" />)}
              <path d={`${facePath} ${holes.map(({ outline }) => polygonPath(outline)).join(" ")}`} fill={fill} fillRule="evenodd" stroke={selected ? "#cc895b" : "#9fa59a"} strokeWidth="0.8" strokeLinejoin="round" />
              <path d={`${facePath} ${holes.map(({ outline }) => polygonPath(outline)).join(" ")}`} fill={`url(#${uniqueId}-concrete)`} fillRule="evenodd" pointerEvents="none" />
              {face.side === "top" && <path d={facePath} fill="none" stroke={selected ? "#e79d65" : "#e9e9e1"} strokeWidth="1.1" pointerEvents="none" />}
              {holes.map(({ vent, outline }) => <path key={vent.id} d={polygonPath(outline)} fill="none" stroke={vent.internal ? "#779c9e" : "#f1a571"} strokeWidth="2.1" strokeLinejoin="round"><title>{`Продух Ø ${variant?.diameterMm} мм · ${face.wall.label} · ось ${formatMetres(input.ventHeight)} от низа цоколя · ${formatMetres(vent.offset)} от начала стены`}</title></path>)}
            </g>
          );
        })}

        {showAirflow && (
          <g className="fv-airflow" aria-hidden="true">
            {geometry.walls.filter((wall) => !wall.internal).flatMap((wall) => {
              const { normal: wallNormal } = wallCorners(wall);
              // wallCorners uses the left normal: inward for a CCW contour, even at concave edges.
              const normal = { x: -wallNormal.x * contourWinding, z: -wallNormal.z * contourWinding };
              return ventsFor(wall.id).filter((_, index) => index % 2 === 0).map((vent) => {
                const before = project({ x: vent.x - normal.x * 0.85, z: vent.z - normal.z * 0.85, y: isPlan ? 0 : input.ventHeight });
                const after = project({ x: vent.x + normal.x * 0.85, z: vent.z + normal.z * 0.85, y: isPlan ? 0 : input.ventHeight });
                return <path key={vent.id} d={`M ${before.x} ${before.y} L ${after.x} ${after.y}`} markerEnd={`url(#${uniqueId}-arrow)`} />;
              });
            })}
          </g>
        )}

        {dimension({ x: minX, z: maxZ + 1.2 }, { x: maxX, z: maxZ + 1.2 }, formatMetres(maxX - minX), "length")}
        {dimension({ x: minX - 1.2, z: minZ }, { x: minX - 1.2, z: maxZ }, formatMetres(maxZ - minZ), "width")}

        <g className="fv-compass" transform="translate(882 83)" aria-hidden="true">
          <circle r="26" fill="#faf9f6" stroke="#e3e2db" />
          <path d="M 0 -15 L -5 0 L 0 -3 L 5 0 Z" fill="#868e83" transform={`rotate(${isPlan ? 0 : yaw * 180 / Math.PI})`} />
          <path d="M 0 15 L -5 0 L 0 3 L 5 0 Z" fill="#d5d8cf" transform={`rotate(${isPlan ? 0 : yaw * 180 / Math.PI})`} />
          <text y="44" textAnchor="middle" fill="#8f948a" fontSize="11">Z</text>
        </g>
      </svg>

      <div className="fv-bottom-bar">
        <div className="fv-camera-controls" aria-label="Управление моделью">
          <button type="button" onClick={() => setZoom((value) => clamp(value - 0.15, 0.65, 1.6))} disabled={zoom <= 0.65} title="Уменьшить" aria-label="Уменьшить масштаб"><Minus size={17} /></button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => clamp(value + 0.15, 0.65, 1.6))} disabled={zoom >= 1.6} title="Увеличить" aria-label="Увеличить масштаб"><Plus size={17} /></button>
          <i />
          <button type="button" onClick={reset} title="Сбросить вид" aria-label="Сбросить поворот и масштаб"><RotateCcw size={15} /></button>
        </div>
        <p className="fv-help">{isPlan ? "Нажмите на стену, чтобы выбрать" : "Перетащите, чтобы повернуть"}</p>
      </div>

      <div className="fv-model-legend"><span /><span>{variant ? `Продухи Ø ${variant.diameterMm} мм` : "Модель фундамента"}</span>{showAirflow && <><span className="fv-air-dot" /><span>Поток воздуха · схема</span></>}</div>

      <style>{`
        .foundation-viewport { position: relative; width: 100%; height: 100%; min-height: 480px; overflow: hidden; background: #f6f6f1; isolation: isolate; }
        .fv-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: grab; user-select: none; }
        .fv-dragging .fv-canvas { cursor: grabbing; }
        .fv-canvas:focus-visible { outline: 2px solid #dc8a58; outline-offset: -5px; border-radius: 8px; }
        .fv-grid line { stroke: #dbdfd3; stroke-width: 0.7; opacity: 0.6; }
        .fv-wall { cursor: pointer; outline: none; }
        .fv-wall:focus-visible > polygon:first-child, .fv-wall:focus-visible > path { stroke: #bc622e; stroke-width: 2.5; }
        .fv-dimension line { stroke: #a3a89c; stroke-width: 0.8; }
        .fv-dimension rect { fill: #f6f6f1; }
        .fv-dimension text { fill: #777f70; font: 500 13px var(--font-geist-sans, Arial), sans-serif; font-variant-numeric: tabular-nums; }
        .fv-airflow { pointer-events: none; }
        .fv-airflow > path { fill: none; stroke: #58a3b7; stroke-width: 1.8; stroke-dasharray: 4 3; opacity: 0.8; }
        .fv-top-note { position: absolute; left: 25px; top: 25px; display: flex; align-items: center; gap: 8px; color: #8a9281; font-size: 9px; letter-spacing: 1.5px; font-weight: 600; z-index: 1; pointer-events: none; }
        .fv-status-dot { width: 5px; height: 5px; border-radius: 100%; background: #7e9872; }
        .fv-bottom-bar { position: absolute; bottom: 54px; left: 23px; right: 23px; display: flex; align-items: center; gap: 17px; justify-content: space-between; pointer-events: none; }
        .fv-camera-controls { display: flex; align-items: center; gap: 2px; background: #ffffffee; padding: 4px; border: 1px solid #e3e5da; border-radius: 11px; box-shadow: 0 2px 5px #29331504; pointer-events: auto; }
        .fv-camera-controls button { display: flex; align-items: center; justify-content: center; width: 31px; height: 31px; border: 0; border-radius: 6px; color: #646e5e; background: transparent; cursor: pointer; transition: background 150ms, color 150ms; }
        .fv-camera-controls button:active { background: #e9ece3; }
        .fv-camera-controls button:focus-visible { outline: 2px solid #dc8a58; outline-offset: 1px; }
        .fv-camera-controls button:disabled { opacity: 0.35; cursor: default; }
        .fv-camera-controls span { color: #747d6b; min-width: 42px; text-align: center; font-size: 10px; font-variant-numeric: tabular-nums; }
        .fv-camera-controls i { height: 17px; width: 1px; background: #e9eae3; margin: 0 4px; }
        .fv-help { color: #989e90; font-size: 10px; margin: 0; }
        .fv-model-legend { position: absolute; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 7px; bottom: 20px; left: 16px; right: 16px; color: #8f9786; font-size: 10px; pointer-events: none; }
        .fv-model-legend > span:first-child { width: 7px; height: 7px; border: 1.5px solid #df925b; border-radius: 50%; }
        .fv-model-legend .fv-air-dot { width: 12px; height: 0; border-top: 1.5px dashed #58a3b7; margin-left: 8px; }
        @media (hover: hover) { .fv-camera-controls button:hover:not(:disabled) { background: #f0f2e9; color: #38482c; } }
        @media (max-width: 600px) { .foundation-viewport { min-height: 385px; } .fv-top-note { left: 17px; top: 18px; font-size: 8px; } .fv-bottom-bar { left: 15px; right: 15px; bottom: 52px; } .fv-help { max-width: 110px; text-align: right; font-size: 9px; } }
        @media (prefers-reduced-motion: reduce) { .fv-camera-controls button { transition: none; } }
      `}</style>
    </div>
  );
}
