"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Download, FileUp, Plus, Printer, RotateCcw, Trash2, Copy, Check, Ruler, CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { BrandMark } from "@/components/brand-mark"
import { VentAuditPlan } from "./vent-audit-plan"
import { VentAuditAssistant } from "./vent-audit-assistant"
import { auditContext, auditProjectSchema, calculateAudit, inspectSystem, migrateAuditProject, newAuditProject, newOpening, openingSize, wallLength, type AuditProject, type Opening } from "@/lib/vent-audit"
import { foundationInputSchema, migrateFoundationProjectV1, walkContour, type ContourStep } from "@/lib/vent-calculator"
import { materialOptions } from "@/lib/site-data"
import { ContourEditor } from "@/components/foundation-contour-editor"

const STORAGE = "sunbur:vent-audit:v3"
const format = (n: number, digits = 2) => n.toLocaleString("ru-RU", { maximumFractionDigits: digits })
const money = (n: number) => `${format(n, 0)} ₽`
const area = (n: number) => `${format(n * 10000, 0)} см²`
function NumberField({ label, value, onChange, min, max, hint, unit = "м" }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; hint?: string; unit?: string }) {
  const id = useId(), [draft, setDraft] = useState(Number.isFinite(value) ? String(value) : "")
  useEffect(() => { if (Number.isFinite(value)) setDraft(String(value)) }, [value])
  const bad = !Number.isFinite(value) || value < min || value > max
  const pattern = min < 0 ? /^-?\d*(?:[.,]\d*)?$/ : /^\d*(?:[.,]\d*)?$/
  return <Field data-invalid={bad || undefined}><FieldLabel htmlFor={id}>{label}{unit ? `, ${unit}` : ""}</FieldLabel><Input id={id} inputMode="decimal" value={draft} aria-invalid={bad} aria-describedby={`${id}-hint`} onChange={e => {
    const text = e.target.value; setDraft(text)
    onChange(text.trim() && pattern.test(text.trim()) ? Number(text.replace(",", ".")) : Number.NaN)
  }} /><FieldDescription id={`${id}-hint`}>{bad ? `Введите число от ${min} до ${max} ${unit}.` : hint}</FieldDescription></Field>
}
function SelectField({ label, value, onChange, children, hint, disabled }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; hint?: string; disabled?: boolean }) {
  const id = useId()
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><select id={id} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined}>{children}</select>{hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}</Field>
}

export function VentAuditWizard({ children, onLegacy }: { children?: ReactNode; onLegacy: () => void }) {
  const [project, setProject] = useState<AuditProject>(newAuditProject)
  const [ready, setReady] = useState(false), [step, setStep] = useState(0)
  const [wallId, setWallId] = useState("wall-1"), [openingId, setOpeningId] = useState<string | null>(null)
  const [proposalId, setProposalId] = useState<"new" | "mixed">("new"), [afterView, setAfterView] = useState(false)
  const [notice, setNotice] = useState(""), [undo, setUndo] = useState<AuditProject | null>(null)
  const upload = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null)
  const validated = useMemo(() => auditProjectSchema.safeParse(project), [project])
  const geometryValid = useMemo(() => foundationInputSchema.safeParse(project.foundation), [project.foundation])
  const context = useMemo(() => validated.success ? auditContext(validated.data) : null, [validated])
  const result = useMemo(() => validated.success && step === 2 ? calculateAudit(validated.data) : null, [validated, step])
  const before = useMemo(() => validated.success && context ? inspectSystem(validated.data, validated.data.openings, context) : null, [validated, context])
  const proposal = result?.proposals.find(p => p.id === proposalId) ?? result?.proposals[0]
  const selectedWall = context?.geometry.walls.find(w => w.id === wallId)
  const selectedOpening = project.openings.find(o => o.id === openingId)
  const displayOpenings = step === 2 && afterView && proposal ? proposal.openings : project.openings

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE) ?? localStorage.getItem("sunbur:vent-audit:v2")
      if (saved) { const migrated = migrateAuditProject(JSON.parse(saved)); if (migrated) { setProject(migrated); setNotice("Ваш дом восстановлен. Можно продолжить с того места, где остановились.") } }
    } catch { /* Optional browser storage. */ }
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready || !validated.success) return
    try { localStorage.setItem(STORAGE, JSON.stringify(validated.data)) } catch { setNotice("Браузер не сохранил черновик. Скачайте проект кнопкой «Сохранить».") }
  }, [ready, validated])
  function change(next: AuditProject, keepInventory = false, keepUndo = false) {
    setProject(keepInventory ? next : { ...next, inventoryComplete: false }); setAfterView(false)
    if (!keepUndo) setUndo(null)
  }
  function foundation<K extends keyof AuditProject["foundation"]>(key: K, value: AuditProject["foundation"][K]) { change({ ...project, foundation: { ...project.foundation, [key]: value } }) }
  function updateContour(next: ContourStep[]) {
    const walk = walkContour(next)
    const xs = walk.vertices.map(v => v.x), zs = walk.vertices.map(v => v.z)
    const length = Math.max(...xs) - Math.min(...xs), width = Math.max(...zs) - Math.min(...zs)
    change({ ...project, foundation: { ...project.foundation, contour: next,
      length: length > 0 ? Number(length.toFixed(2)) : project.foundation.length, width: width > 0 ? Number(width.toFixed(2)) : project.foundation.width } })
  }
  function updateOpening(patch: Partial<Opening>) { change({ ...project, openings: project.openings.map(o => o.id === openingId ? { ...o, ...patch } : o) }) }
  function updatePartition(id: string, patch: Partial<AuditProject["partitions"][number]>) { change({ ...project, partitions: project.partitions.map(a => a.id === id ? { ...a, ...patch } : a) }) }
  function nextId(prefix: string, ids: string[]) { let n = 1; while (ids.includes(`${prefix}${n}`)) n++; return `${prefix}${n}` }
  function addOpening(copy?: Opening) {
    if (!selectedWall || project.openings.length >= 100) return
    const id = nextId("П", project.openings.map(o => o.id))
    const opening = copy ? { ...copy, id, offset: Math.min(wallLength(selectedWall) - 0.2, copy.offset + 1) } : newOpening(selectedWall.id, Number((wallLength(selectedWall) / 2).toFixed(2)), project.foundation.ventHeight, id)
    setUndo(project); change({ ...project, openings: [...project.openings, opening] }, false, true); setOpeningId(id)
    setNotice(`${id} добавлен. Укажите его настоящий размер и расстояние от начала стены.`)
  }
  function removeOpening(id: string) { setUndo(project); change({ ...project, openings: project.openings.filter(o => o.id !== id) }, false, true); setOpeningId(null); setNotice("Продух удалён из схемы. Можно отменить.") }
  function navigate(n: number) { setStep(n); setAfterView(false); setTimeout(() => { heading.current?.focus(); heading.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 0) }
  function download() {
    if (!validated.success) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(validated.data, null, 2)], { type: "application/json" }))
    const a = document.createElement("a"); a.href = url; a.download = "sunbur-moi-produhi.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice("Проект сохранён в файл. Его можно открыть здесь снова.")
  }
  async function importFile(file?: File) {
    if (!file) return
    try {
      if (file.size > 150_000) throw new Error("Слишком большой файл. Максимум 150 КБ.")
      const raw = JSON.parse((await file.text()).replace(/^\uFEFF/, ""))
      const legacy = migrateFoundationProjectV1(raw)
      if (legacy) {
        localStorage.setItem("sunbur:vent-foundation:v1", JSON.stringify(legacy)); onLegacy(); return
      }
      const migrated = migrateAuditProject(raw)
      if (!migrated) throw new Error("Не удалось открыть проект. Выберите файл, сохранённый этим калькулятором.")
      setUndo(project); setProject(migrated); setOpeningId(null); setWallId("wall-1"); setStep(0); setNotice("Проект открыт. Все проверки пересчитаны.")
    } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось открыть файл.") }
    if (upload.current) upload.current.value = ""
  }
  const stepNames = ["Ваш фундамент", "Ваши продухи", "Что улучшить"]
  return <div className="vent-studio va-screen">
    <header className="va-header va-no-print"><Link href="/" className="va-brand"><BrandMark /> SUNBUR</Link><span>Понятные инструменты для дома</span><Link href="/uslugi/produhi-v-fundamente">Об услуге</Link></header>
    <main className="va-main">
      <div className="va-intro"><div><p className="va-eyebrow">ПРОВЕРИМ ВАШ ДОМ ВМЕСТЕ</p><h1>Хватает ли продухов<br />в вашем фундаменте?</h1><p>Покажите, что уже есть. Подскажем, что оставить,<br className="va-desktop" /> где добавить и какие отверстия можно рассмотреть для расширения.</p></div><div className="va-project-tools va-no-print"><Button variant="outline" onClick={() => upload.current?.click()}><FileUp data-icon="inline-start" />Открыть</Button><Button variant="outline" onClick={download} disabled={!validated.success}><Download data-icon="inline-start" />Сохранить</Button><input ref={upload} hidden type="file" accept=".json,application/json" aria-label="Открыть проект" onChange={e => void importFile(e.target.files?.[0])} /></div></div>
      <div className="va-mode-note va-no-print"><span><Check aria-hidden="true" /> Проверяю существующие продухи</span><Button variant="link" onClick={onLegacy}>У меня пока нет продухов →</Button></div>
      <nav className="va-steps va-no-print" aria-label="Шаги проверки">{stepNames.map((name, i) => <button key={name} aria-current={step === i ? "step" : undefined} onClick={() => navigate(i)}><span>{i + 1}</span><strong>{name}</strong>{i < 2 && <ArrowRight aria-hidden="true" />}</button>)}</nav>
      <div className="va-notice va-no-print" role="status">{notice}{undo && <Button variant="link" onClick={() => { setProject(undo); setUndo(null); setNotice("Последнее действие отменено.") }}><RotateCcw data-icon="inline-start" />Отменить</Button>}</div>
      <div className="va-layout">
        <div className="va-work">
          <section className="va-section va-no-print">
            <div className="va-section-title"><span className="va-step-number">{step + 1}</span><div><h2 ref={heading} tabIndex={-1}>{stepNames[step]}</h2><p>{["Начнём с формы и размеров. Подполье — это пространство под полом.", "Выберите стену на схеме и добавьте отверстия, которые на ней уже есть.", "Сравните вашу систему с предложенными изменениями."][step]}</p></div></div>
            {step === 0 && <FieldGroup>
              <SelectField label="Что находится под полом?" value={project.kind} onChange={v => change({ ...project, kind: v as AuditProject["kind"] })}><option value="crawlspace">Подполье за закрытым цоколем</option><option value="basement">Подвал — помещение под домом</option><option value="slab">Плита, подполья нет</option><option value="unknown">Пока не знаю</option></SelectField>
              {project.kind !== "crawlspace" && <p className="va-message">Этот подбор предназначен для подполья за закрытым цоколем. Расскажите помощнику о вашем доме — он подскажет, что уточнить.</p>}
              <div className="va-fields-grid">
                <SelectField label="Форма дома сверху" value={project.foundation.shape} disabled={project.openings.length > 0} hint={project.openings.length ? "Форма закреплена, чтобы ваши отверстия не оказались на других стенах. Для другой формы начните отдельный проект." : "Размеры по осям стен: от середины одной стены до середины другой."} onChange={v => {
                  const shape = v as AuditProject["foundation"]["shape"]
                  if (shape === "custom" && project.foundation.shape !== "custom") {
                    const { length, width } = project.foundation
                    change({ ...project, foundation: { ...project.foundation, shape, contour: [{ id: "c1", length, turn: "right" }, { id: "c2", length: width, turn: "right" }, { id: "c3", length, turn: "right" }, { id: "c4", length: width, turn: "right" }] } })
                  } else foundation("shape", shape)
                }}><option value="rectangle">Прямоугольник</option><option value="l">Буквой Г</option><option value="u">Буквой П</option><option value="custom">Свой контур</option></SelectField>
                <SelectField label="Из чего фундамент?" value={project.foundation.material} onChange={v => foundation("material", v as AuditProject["foundation"]["material"])}>{materialOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</SelectField>
                {project.foundation.shape !== "custom" && <NumberField label="Длина дома" value={project.foundation.length} min={2} max={40} onChange={v => foundation("length", v)} hint="Горизонтальный размер на плане." />}
                {project.foundation.shape !== "custom" && <NumberField label="Ширина дома" value={project.foundation.width} min={2} max={40} onChange={v => foundation("width", v)} hint="Вертикальный размер на плане." />}
                {(project.foundation.shape === "l" || project.foundation.shape === "u") && <NumberField label="Ширина крыла" value={project.foundation.wing} min={1} max={20} onChange={v => foundation("wing", v)} hint="Толщина «ножек» буквы Г или П на плане." />}
                <NumberField label="Высота цоколя в схеме" value={project.foundation.height} min={0.3} max={2.5} onChange={v => foundation("height", v)} hint="От принятого низа цоколя до его верха. От этого же низа измеряйте высоту отверстий." />
                <NumberField label="Толщина стен" unit="мм" value={project.foundation.thickness} min={100} max={1000} onChange={v => foundation("thickness", v)} hint="Например, 40 см = 400 мм. Пока принимаем одинаковую толщину всех стен." />
              </div>
              {project.foundation.shape === "custom" && <div className="va-details"><strong>Контур фундамента</strong><ContourEditor input={project.foundation} contour={project.foundation.contour} onChange={updateContour} disabled={project.openings.length > 0} /><p className="va-plan-note">Габариты по осям: {format(project.foundation.length)} × {format(project.foundation.width)} м.</p></div>}
              <details className="va-details"><summary>Есть внутренние стены под полом? <span>{project.partitions.length ? `${project.partitions.length} добавлено` : "Добавить перемычки"}</span></summary><p>Добавьте стены, которые делят подполье на отсеки. Если перемычка не достаёт до другой стены и её можно обойти сбоку, укажите её отрезок короче — с открытого края останется проход. Проёмы в самой перемычке отметим на следующем шаге.</p>
                {project.partitions.map((part, i) => { const limit = part.axis === "x" ? project.foundation.length : project.foundation.width, edge = part.axis === "x" ? "левого" : "верхнего"
                  return <div className="va-partition" key={part.id}><strong>Перемычка {i + 1}</strong><SelectField label="Направление" value={part.axis} onChange={v => { const axis = v as "x" | "z", newLimit = Number((axis === "x" ? project.foundation.length : project.foundation.width).toFixed(2)); updatePartition(part.id, { axis, from: 0, to: newLimit }) }}><option value="x">Слева направо на плане</option><option value="z">Сверху вниз на плане</option></SelectField><NumberField label={part.axis === "x" ? "От верхней стороны плана" : "От левой стороны плана"} min={0.1} max={(part.axis === "x" ? project.foundation.width : project.foundation.length) - 0.1} value={part.position} onChange={v => updatePartition(part.id, { position: v })} /><div className="va-fields-grid"><NumberField label={`Начало отрезка от ${edge} края`} min={0} max={limit} value={part.from} onChange={v => updatePartition(part.id, { from: v })} /><NumberField label={`Конец отрезка от ${edge} края`} min={0} max={limit} value={part.to} onChange={v => updatePartition(part.id, { to: v })} hint={part.to - part.from >= limit - 0.01 ? "Во всю ширину — обхода сбоку нет." : "Короче — с открытого края останется проход в обход."} /></div><div className="va-fields-grid"><SelectField label="Материал перемычки" value={part.material} onChange={v => updatePartition(part.id, { material: v as AuditProject["partitions"][number]["material"] })}>{materialOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</SelectField><NumberField label="Толщина перемычки" unit="мм" value={part.thickness} min={100} max={1000} onChange={v => updatePartition(part.id, { thickness: v })} /></div><Button variant="ghost" onClick={() => { setUndo(project); change({ ...project, partitions: project.partitions.filter(a => a.id !== part.id) }, false, true) }}><Trash2 data-icon="inline-start" />Удалить перемычку {i + 1}</Button></div> })}
                <Button variant="outline" disabled={project.partitions.length >= 8} onClick={() => change({ ...project, partitions: [...project.partitions, { id: nextId("partition-", project.partitions.map(a => a.id)), axis: "x", position: Number((project.foundation.width / 2).toFixed(2)), from: 0, to: Number(project.foundation.length.toFixed(2)), material: "brick", thickness: 200 }] })}><Plus data-icon="inline-start" />Добавить внутреннюю стену</Button>
              </details>
              <p className="va-help"><CircleHelp aria-hidden="true" />Сейчас стоят размеры для примера. Замените их на свои. Не знаете, как измерить? Спросите Бита справа или ниже.</p>
            </FieldGroup>}
            {step === 1 && <>
              <FieldGroup><SelectField label="На какой стене добавляем продух?" value={selectedWall?.id ?? ""} onChange={v => { setWallId(v); setOpeningId(null) }}><option value="" disabled>Выберите стену</option>{context?.geometry.walls.map(w => <option key={w.id} value={w.id}>{w.label}{w.internal ? " · внутренняя" : " · наружная"} — {format(wallLength(w))} м</option>)}</SelectField></FieldGroup>
              <div className="va-add-row"><Button onClick={() => addOpening()} disabled={!selectedWall || project.openings.length >= 100}><Plus data-icon="inline-start" />Добавить продух на этой стене</Button><span>{project.openings.length} из 100 отверстий</span></div>
              {!project.openings.length && <p className="va-help">Пока отверстий на схеме нет. Добавьте их по одному. Если их действительно нет, отметьте это ниже и переходите к проверке.</p>}
              {project.openings.length > 0 && <div className="va-opening-list" aria-label="Добавленные продухи">{project.openings.map(o => <button key={o.id} aria-pressed={openingId === o.id} onClick={() => { setOpeningId(o.id); setWallId(o.wallId) }}><strong>{o.id}</strong><span>{openingSize(o)}<small>{context?.geometry.walls.find(w => w.id === o.wallId)?.label ?? "Укажите стену"} · {format(o.offset)} м</small></span>{o.freePercent === null && <span className="va-needs-data">Уточнить</span>}</button>)}</div>}
              {selectedOpening && <div className="va-opening-editor" key={selectedOpening.id}>
                <div className="va-editor-title"><h3>Продух {selectedOpening.id}</h3><Button variant="ghost" onClick={() => removeOpening(selectedOpening.id)}><Trash2 data-icon="inline-start" />Удалить</Button></div>
                <FieldGroup><SelectField label="Стена продуха" value={selectedOpening.wallId} onChange={v => { setWallId(v); updateOpening({ wallId: v }) }}>{!context?.geometry.walls.some(w => w.id === selectedOpening.wallId) && <option value={selectedOpening.wallId}>Прежняя стена недоступна — выберите другую</option>}{context?.geometry.walls.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}</SelectField><div className="va-fields-grid">
                  <NumberField label="От начала стены до центра" value={selectedOpening.offset} min={0} max={selectedWall ? wallLength(selectedWall) : 80} onChange={v => updateOpening({ offset: v })} hint="На плане начало выбранной стены отмечено точкой «0 м»." />
                  <NumberField label="Высота центра от низа цоколя" value={selectedOpening.height} min={0} max={project.foundation.height} onChange={v => updateOpening({ height: v })} hint="Измеряйте от того же низа, что и высоту цоколя, не от земли." />
                  <SelectField label="Форма отверстия" value={selectedOpening.shape} onChange={v => updateOpening({ shape: v as Opening["shape"] })}><option value="circle">Круглое</option><option value="rectangle">Прямоугольное</option></SelectField>
                  {selectedOpening.shape === "circle" ? <NumberField label="Диаметр прохода" unit="мм" value={selectedOpening.diameter} min={20} max={1000} onChange={v => updateOpening({ diameter: v })} hint="Размер внутри трубы/гильзы. Например, 15 см = 150 мм." /> : <><NumberField label="Ширина прохода" unit="мм" value={selectedOpening.width} min={20} max={2000} onChange={v => updateOpening({ width: v })} /><NumberField label="Высота прохода" unit="мм" value={selectedOpening.openingHeight} min={20} max={2000} onChange={v => updateOpening({ openingHeight: v })} /></>}
                  <SelectField label="Сейчас отверстие открыто?" value={selectedOpening.state} onChange={v => updateOpening({ state: v as Opening["state"] })}><option value="open">Да, проход свободен</option><option value="closed">Нет, закрыто</option><option value="unknown">Не знаю / частично перекрыто</option></SelectField>
                  <SelectField label="Решётка или сетка" value={selectedOpening.freePercent === null ? "unknown" : selectedOpening.freePercent === 100 ? "none" : "known"} onChange={v => updateOpening({ freePercent: v === "unknown" ? null : v === "none" ? 100 : 70 })} hint="Свободное сечение — доля площади, не закрытая решёткой. Смотрите паспорт изделия."><option value="unknown">Не знаю свободное сечение</option><option value="none">Решётки и сетки нет</option><option value="known">Знаю свободное сечение, %</option></SelectField>
                  {selectedOpening.freePercent !== null && selectedOpening.freePercent !== 100 && <NumberField label="Свободное сечение решётки" unit="%" value={selectedOpening.freePercent} min={1} max={100} onChange={v => updateOpening({ freePercent: v })} hint="70% — пример. Укажите значение вашего изделия." />}
                  <SelectField label="Куда выходит отверстие?" value={selectedOpening.outlet} onChange={v => updateOpening({ outlet: v as Opening["outlet"] })}><option value="auto">{selectedWall?.internal ? "В соседний отсек подполья" : "На открытый воздух"}</option><option value="enclosed">В закрытую пристройку / преграду</option><option value="unknown">Нужно проверить</option></SelectField>
                </div><label className="va-check"><input type="checkbox" checked={selectedOpening.expandable} disabled={selectedOpening.shape !== "circle"} onChange={e => updateOpening({ expandable: e.target.checked })} /><span>Рассмотреть увеличение этого отверстия<small>Только как предварительный вариант. Возможность проверит мастер.</small></span></label></FieldGroup>
                <Button variant="outline" onClick={() => addOpening(selectedOpening)} disabled={!selectedWall || project.openings.length >= 100}><Copy data-icon="inline-start" />Добавить ещё такое же</Button>
              </div>}
              <details className="va-details"><summary>Где нельзя сверлить?</summary><p>Отметьте участки с коммуникациями, входом или без доступа. Запрет действует на всю высоту стены.</p>{project.blocked.map(b => <div className="va-partition" key={b.id}><FieldGroup><SelectField label="Стена запретного участка" value={b.wallId} onChange={v => change({ ...project, blocked: project.blocked.map(a => a.id === b.id ? { ...a, wallId: v } : a) })}>{context?.geometry.walls.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}</SelectField><div className="va-fields-grid"><NumberField label="От начала стены" min={0} max={80} value={b.from} onChange={v => change({ ...project, blocked: project.blocked.map(a => a.id === b.id ? { ...a, from: v } : a) })} /><NumberField label="До отметки" min={0} max={80} value={b.to} onChange={v => change({ ...project, blocked: project.blocked.map(a => a.id === b.id ? { ...a, to: v } : a) })} /></div></FieldGroup><Button variant="ghost" onClick={() => { setUndo(project); change({ ...project, blocked: project.blocked.filter(a => a.id !== b.id) }, false, true) }}>Удалить запрет</Button></div>)}<Button variant="outline" disabled={!selectedWall || project.blocked.length >= 40} onClick={() => change({ ...project, blocked: [...project.blocked, { id: nextId("blocked-", project.blocked.map(b => b.id)), wallId, from: 0, to: selectedWall ? wallLength(selectedWall) : 1 }] })}><Plus data-icon="inline-start" />Добавить запрет на выбранной стене</Button></details>
              <label className="va-check va-confirm"><input type="checkbox" checked={project.inventoryComplete} onChange={e => change({ ...project, inventoryComplete: e.target.checked }, true)} /><span>{project.openings.length ? "Я отметил все существующие продухи и проходы в перемычках" : "Подтверждаю: существующих продухов и проходов нет"}<small>Если что-то добавите или измените, подтвердите список ещё раз.</small></span></label>
            </>}
            {step === 2 && result && <>
              <div className="va-summary"><strong>{result.blocked ? "Сначала уточним данные" : before?.meetsModel ? "По выбранной модели добавлять продухи не требуется" : "Есть что проверить и улучшить"}</strong><p>{result.blocked ? "Ниже указано, чего не хватает для подбора. Помощник объяснит, как это узнать." : "Это предварительная проверка схемы. Каждый пункт можно обсудить с помощником."}</p></div>
              <div className="va-metrics"><div><span>Сейчас свободно</span><strong>{area(result.before.externalFreeArea)}</strong></div><div><span>Цель по сценарию</span><strong>{area(result.before.requiredArea)}</strong></div><div><span>Отсеков без пути наружу</span><strong>{result.before.isolated.length} из {result.before.rooms}</strong></div></div>
              <div className="va-issues">{result.before.issues.map((issue, i) => <div className="va-issue" data-level={issue.level} key={`${issue.code}-${i}`}><strong>{issue.level === "problem" ? "Проверить" : issue.level === "unknown" ? "Нужно уточнить" : "Учесть"}</strong><p>{issue.text}</p>{issue.openingId && <Button variant="link" onClick={() => { setOpeningId(issue.openingId!); if (issue.wallId) setWallId(issue.wallId); navigate(1) }}>Открыть {issue.openingId}</Button>}</div>)}</div>
              {!!result.proposals.length && <><h3 className="va-subheading">Варианты доработки</h3><fieldset className="va-proposal-options"><legend className="sr-only">Выберите вариант доработки</legend>{result.proposals.map(p => <label key={p.id} data-selected={proposal?.id === p.id}><input type="radio" name="proposal" value={p.id} checked={proposal?.id === p.id} onChange={() => { setProposalId(p.id as "new" | "mixed"); setAfterView(true) }} /><span><strong>{p.title}</strong><small>{p.actions.filter(a => a.kind === "add").length} новых · {p.actions.filter(a => a.kind === "enlarge").length} расширений</small><b>{p.costComplete ? money(p.knownCost) : `${money(p.knownCost)} + расширение по осмотру`}</b><small>{p.solved ? "Заданные проверки пройдены" : "Остались нерешённые вопросы"}</small></span></label>)}</fieldset>
                {proposal && <><p className="va-help">{proposal.actions.length ? "Стоимость — ориентир работ по бурению. Решётки, гильзы и отделка не включены. Расширение требует отдельной оценки." : "Новых работ по выбранным условиям не найдено. Если в подполье сыро, одного расчёта площади недостаточно."}</p>
                  {!proposal.solved && <div className="va-message"><strong>{proposal.limited ? "Достигнут предел поиска." : "Полностью подходящий вариант не найден."}</strong><p>Не удалось устранить все проблемы в доступных местах с заданными диаметрами и отступами. Это частичный вариант для обсуждения, а не готовая схема.</p>{proposal.after.issues.filter(i => i.level === "problem").map((i, n) => <p key={n}>{i.text}</p>)}</div>}
                  <div className="va-comparison"><div><span>До</span><strong>{area(result.before.externalFreeArea)}</strong></div><ArrowRight aria-hidden="true" /><div><span>После предложенных работ</span><strong>{area(proposal.after.externalFreeArea)}</strong></div></div>
                  <ol className="va-actions">{proposal.actions.map(a => <li key={a.opening.id}><strong>{a.kind === "add" ? `Добавить ${a.opening.id.replace("new-", "Н")}` : `Расширить ${a.opening.id}`}: {a.before ? `${openingSize(a.before)} → ` : ""}{openingSize(a.opening)}</strong><p>{result.geometry.walls.find(w => w.id === a.opening.wallId)?.label} · {format(a.opening.offset)} м от начала · центр {format(a.opening.height)} м от низа цоколя</p><p>{a.reason} {a.gain > 0 ? `Прирост: ${area(a.gain)}.` : "Во внешнюю площадь не входит."}</p><span>{a.price === null ? "Стоимость и возможность — после осмотра" : money(a.price)}</span></li>)}</ol>
                </>}
              </>}
              {result.blocked && <Button onClick={() => navigate(1)}>Вернуться к своим продухам</Button>}
            </>}
            {!validated.success && <div className="va-error" role="alert"><strong>Уточните введённые значения</strong>{validated.error.issues.map((issue, i) => <p key={i}>{issue.path.join(".")}: {issue.message}</p>)}</div>}
          </section>

          <section className="va-plan-section" aria-label="Схема вашего фундамента"><div className="va-plan-heading"><div><h2>Ваш дом сверху</h2><p>{context ? `${format(context.geometry.area)} м² по осям стен · ${context.rooms} отсек(а)` : "Исправьте размеры, чтобы увидеть схему"}</p></div>{step === 2 && proposal && <label className="va-check va-no-print"><input type="checkbox" checked={afterView} onChange={e => setAfterView(e.target.checked)} /><span>Показать изменения</span></label>}</div>
            {context ? <VentAuditPlan geometry={context.geometry} openings={displayOpenings} original={project.openings} cells={context.cells} selectedWall={wallId} selectedOpening={openingId} onWall={id => { setWallId(id); setOpeningId(null) }} onOpening={id => { if (project.openings.some(o => o.id === id)) { setOpeningId(id); if (step !== 1) navigate(1) } }} /> : <p className="va-help">Укажите корректные размеры в полях выше.</p>}
            <div className="va-legend"><span><i data-kind="existing" /> Уже есть</span><span><i data-kind="new" /> Н — добавить</span><span><i data-kind="enlarged" /> Увеличить</span><span>× Закрыто / не проверено</span></div><p className="va-plan-note">{selectedWall ? `${selectedWall.label}: начало X=${format(selectedWall.start.x)}, Z=${format(selectedWall.start.z)} м; конец X=${format(selectedWall.end.x)}, Z=${format(selectedWall.end.z)} м. ` : "Выберите стену. "}Размеры по осям стен. Нажмите на стену или номер продуха.</p>
          </section>

          <details className="va-details va-assumptions va-no-print"><summary>Условия проверки и новых работ</summary><p>Это настройки предварительного сценария. Они не заменяют проект и проверку прочности фундамента.</p><FieldGroup><div className="va-fields-grid">
            <NumberField label="Высота центра новых отверстий" value={project.foundation.ventHeight} min={0.1} max={project.foundation.height - 0.01} onChange={v => foundation("ventHeight", v)} hint="От низа цоколя, того же, что на первом шаге." />
            <NumberField label="Свободное сечение новых решёток" value={project.foundation.grilleFreePercent} min={10} max={100} unit="%" onChange={v => foundation("grilleFreePercent", v)} />
            <NumberField label="Максимальный шаг по модели" value={project.foundation.maxSpacing} min={0.5} max={5} onChange={v => foundation("maxSpacing", v)} />
            <NumberField label="Отступ от примыкания до края" value={project.foundation.cornerOffset} min={0.15} max={1.5} onChange={v => foundation("cornerOffset", v)} />
            <NumberField label="Целевая доля площади: 1 /" value={project.foundation.areaRatio} min={100} max={1000} unit="" onChange={v => foundation("areaRatio", v)} hint="400 — сценарий для предварительного сравнения, не универсальная норма." />
          </div><label className="va-check"><input type="checkbox" checked={project.groundLevel !== null} onChange={e => change({ ...project, groundLevel: e.target.checked ? 0 : null })} /><span>Знаю уровень земли относительно низа цоколя</span></label>{project.groundLevel !== null && <NumberField label="Земля выше (+) или ниже (−) низа цоколя на" value={project.groundLevel} min={-2} max={2.5} onChange={v => change({ ...project, groundLevel: v })} hint="0 — земля на уровне низа цоколя. Положительное значение — земля выше низа цоколя. Отрицательное — земля ниже низа цоколя. Для неровного участка нужна проверка по каждой стене на объекте." />}<label className="va-check"><input type="checkbox" checked={project.allowNew} onChange={e => change({ ...project, allowNew: e.target.checked }, true)} /><span>Можно рассматривать новые отверстия</span></label><label className="va-check"><input type="checkbox" checked={project.foundation.underFloor} onChange={e => foundation("underFloor", e.target.checked)} /><span>Бурение из подпола — учесть доплату</span></label></FieldGroup></details>

          <div className="va-bottom-nav va-no-print">{step > 0 && <Button variant="outline" onClick={() => navigate(step - 1)}><ArrowLeft data-icon="inline-start" />Назад</Button>}{step < 2 ? <Button disabled={!validated.success || !geometryValid.success || (step === 0 && project.kind !== "crawlspace")} onClick={() => navigate(step + 1)}>{step === 0 ? "Размеры верны, дальше" : "Проверить мои продухи"}<ArrowRight data-icon="inline-end" /></Button> : <Button onClick={() => window.print()} disabled={!result}><Printer data-icon="inline-start" />Сохранить результат в PDF / печать</Button>}</div>

          {result && <section className="va-print-only"><h2>Проверка существующих продухов SUNBUR</h2><p>Форма {project.foundation.shape}; {project.foundation.length} × {project.foundation.width} м. Высота {project.foundation.height} м, толщина {project.foundation.thickness} мм. Материал: {materialOptions.find(m => m.value === project.foundation.material)?.label}.</p><h3>Существующие отверстия</h3><table><thead><tr><th>№ / стена</th><th>Размер</th><th>От начала / высота, м</th><th>Сечение / состояние</th></tr></thead><tbody>{project.openings.map(o => <tr key={o.id}><td>{o.id} · {result.geometry.walls.find(w => w.id === o.wallId)?.label ?? "Нет привязки"}</td><td>{openingSize(o)}</td><td>{format(o.offset)} / {format(o.height)}</td><td>{o.freePercent ?? "?"}% · {o.state === "open" ? "открыт" : o.state === "closed" ? "закрыт" : "неизвестно"}</td></tr>)}</tbody></table><p>Наружная свободная площадь: {area(result.before.externalFreeArea)}. Цель: {area(result.before.requiredArea)}. Площадь после: {proposal ? area(proposal.after.externalFreeArea) : "вариант не сформирован"}.</p>{result.before.issues.map((i, n) => <p key={n}>{i.text}</p>)}{proposal && <><h3>{proposal.title} · {proposal.solved ? "проверки модели пройдены" : "частичный вариант"}</h3>{proposal.actions.map(a => <p key={a.opening.id}>{a.kind === "add" ? "Добавить" : "Расширить"} {a.opening.id}: {a.before ? `${openingSize(a.before)} → ` : ""}{openingSize(a.opening)}. {result.geometry.walls.find(w => w.id === a.opening.wallId)?.label}, от начала {format(a.opening.offset)} м, центр от низа {format(a.opening.height)} м. {a.reason} {a.price === null ? "Цена по осмотру" : money(a.price)}.</p>)}<p>Известные работы: {money(proposal.knownCost)}{!proposal.costComplete && "; расширение оценивается отдельно"}.</p></>}{result.geometry.walls.map(w => <p key={w.id}>{w.label}: начало X={format(w.start.x)}, Z={format(w.start.z)}; конец X={format(w.end.x)}, Z={format(w.end.z)} м.</p>)}</section>}
          <div className="va-limits">{result ? result.assumptions.map((a, i) => <p key={i}>{a}</p>) : <p>Предварительная схема для обсуждения с мастером. Прочность фундамента, арматуру и фактическую вентиляцию проверяют на объекте.</p>}</div>
        </div>
        <VentAuditAssistant project={project} step={step} proposalId={proposal?.id as "new" | "mixed" ?? null} valid={validated.success} onApply={p => { setUndo(project); change(p, false, true); setNotice("Предложение помощника применено. Проверьте новые значения на схеме.") }} />
      </div>
      <div className="va-no-print">{children}</div>
      <footer className="va-footer"><Link href="/">SUNBUR · алмазное бурение</Link><Link href="/#contacts">Обсудить схему с мастером →</Link><Button className="va-no-print" variant="ghost" onClick={() => { setUndo(project); setProject(newAuditProject()); setOpeningId(null); setStep(0); setNotice("Начат новый проект. Прежний можно вернуть кнопкой «Отменить».") }}><RotateCcw data-icon="inline-start" />Начать заново</Button></footer>
    </main>
  </div>
}
