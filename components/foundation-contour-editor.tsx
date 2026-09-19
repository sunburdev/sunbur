"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { foundationInputSchema, templateContour, validateContour, type ContourStep, type FoundationInput } from "@/lib/vent-calculator"

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
const nextStepId = (steps: ContourStep[]) => { let n = 1; while (steps.some(s => s.id === `c${n}`)) n++; return `c${n}` }
const templates = [{ id: "t", label: "Т-образный" }, { id: "cross", label: "Крестом" }] as const

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
    <p className="fc-contour-hint">Обходите дом по периметру, начиная от любого угла и всё время в одну сторону. После каждой стены укажите её длину и куда дальше сворачивает дом — влево или вправо от направления движения.</p>
    <div className="fc-contour-templates"><span>Частая форма:</span>{templates.map(t => <button type="button" key={t.id} disabled={disabled} onClick={() => applyTemplate(t.id)}>{t.label}</button>)}</div>
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
