"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, Check, ChevronDown, CircleHelp, Download, FileUp, Layers3, Loader2, Plus, Printer, RotateCcw, Ruler, Send, SlidersHorizontal, Sparkles, Wind } from "lucide-react"
import { FoundationView } from "@/components/foundation-view"
import { BrandMark } from "@/components/brand-mark"
import { CALCULATION_SOURCES, DEFAULT_FOUNDATION, calculateVentilation, foundationInputSchema, migrateFoundationProjectV1, walkContour } from "@/lib/vent-calculator"
import type { ContourStep, FoundationInput } from "@/lib/vent-calculator"
import { materialOptions } from "@/lib/site-data"
import { ContourEditor } from "@/components/foundation-contour-editor"

const STORAGE_KEY = "sunbur:vent-foundation:v1"
const number = (value: number, digits = 1) => value.toLocaleString("ru-RU", { maximumFractionDigits: digits })
const money = (value: number) => `${number(value, 0)} ₽`
const shapeNames = { rectangle: "Прямоугольник", l: "Г-образный", u: "П-образный", custom: "Свой контур" }

function NumericField({ label, value, onChange, min, max, step = 0.1, unit = "м" }: {
  label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; unit?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])
  return <div className="vc-field">
    <label htmlFor={id}>{label}</label>
    <div className="vc-number"><input id={id} type="number" inputMode="decimal" value={draft} min={min} max={max} step={step}
      onChange={(event) => {
        setDraft(event.target.value)
        if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber)
      }} onBlur={() => { if (draft === "") setDraft(String(value)) }} /><span>{unit}</span></div>
  </div>
}

function ShapeIcon({ shape }: { shape: FoundationInput["shape"] }) {
  const path = shape === "rectangle" ? "M6 5H42V33H6Z" : shape === "l" ? "M6 5H23V19H42V33H6Z" : shape === "u" ? "M6 5H16V23H32V5H42V33H6Z" : "M6 5H18V17H30V5H42V17H30V29H42V33H6V17H18Z"
  return <svg viewBox="0 0 48 38" fill="none" aria-hidden="true"><path d={path} fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
}

export function VentConstructor({ children }: { children?: ReactNode }) {
  const [input, setInput] = useState<FoundationInput>(DEFAULT_FOUNDATION)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedWall, setSelectedWall] = useState<string | null>(null)
  const [view, setView] = useState<"3d" | "plan">("3d")
  const [airflow, setAirflow] = useState(false)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState("")
  const [question, setQuestion] = useState("")
  const [advice, setAdvice] = useState<{ answer: string; source: "llm" | "calculation"; signature: string } | null>(null)
  const [adviceError, setAdviceError] = useState("")
  const [busy, setBusy] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const adviceAbort = useRef<AbortController | null>(null)
  const validated = useMemo(() => foundationInputSchema.safeParse(input), [input])
  const result = useMemo(() => validated.success ? calculateVentilation(validated.data) : null, [validated])
  const variant = result?.variants.find((item) => item.id === selectedId && item.feasible) ?? result?.variants.find((item) => item.id === result.recommendedId) ?? result?.variants.find((item) => item.feasible) ?? result?.variants[0] ?? null
  const chosenWall = result?.geometry.walls.find((wall) => wall.id === selectedWall)
  const signature = JSON.stringify({ input, variantId: variant?.id })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const project = migrateFoundationProjectV1(JSON.parse(saved))
        if (project) {
          setInput(project.input)
          setSelectedId(typeof project.selectedVariantId === "string" ? project.selectedVariantId : null)
          setNotice("Восстановлен ваш последний проект")
        }
      }
    } catch { /* A blocked or outdated local draft does not prevent calculation. */ }
    setReady(true)
    return () => adviceAbort.current?.abort()
  }, [])

  useEffect(() => {
    if (!ready || !validated.success) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, input: validated.data, selectedVariantId: selectedId })) } catch { /* Storage is optional. */ }
  }, [ready, validated, selectedId])

  function update<K extends keyof FoundationInput>(key: K, value: FoundationInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }))
    if (key === "shape" || key === "partitions") setSelectedWall(null)
  }

  function selectShape(shape: FoundationInput["shape"]) {
    if (shape === "custom" && input.shape !== "custom") {
      const { length, width } = input
      update("shape", shape)
      update("contour", [{ id: "c1", length, turn: "right" }, { id: "c2", length: width, turn: "right" }, { id: "c3", length, turn: "right" }, { id: "c4", length: width, turn: "right" }])
    } else update("shape", shape)
  }

  function updateContour(next: ContourStep[]) {
    const walk = walkContour(next)
    const xs = walk.vertices.map((v) => v.x), zs = walk.vertices.map((v) => v.z)
    const length = Math.max(...xs) - Math.min(...xs), width = Math.max(...zs) - Math.min(...zs)
    setInput((previous) => ({ ...previous, contour: next,
      length: length > 0 ? Number(length.toFixed(2)) : previous.length, width: width > 0 ? Number(width.toFixed(2)) : previous.width }))
  }

  function downloadProject() {
    if (!result || !variant) return
    const blob = new Blob([JSON.stringify({ version: 1, input, selectedVariantId: variant.id, calculation: result, note: "Предварительная схема. Координаты по осям стен; требуется проверка конструктора." }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url; anchor.download = "sunbur-produhi.json"; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice("Проект сохранён. Его можно открыть здесь снова.")
  }

  async function importProject(file?: File) {
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error("Файл слишком большой")
      const data = migrateFoundationProjectV1(JSON.parse((await file.text()).replace(/^\uFEFF/, "")))
      if (!data) throw new Error("Неверный формат проекта")
      setInput(data.input)
      setSelectedId(typeof data.selectedVariantId === "string" ? data.selectedVariantId : null)
      setSelectedWall(null); setAdvice(null)
      setNotice("Проект открыт. Расчёт обновлён по текущим расценкам.")
    } catch { setNotice("Не удалось открыть файл. Выберите JSON-проект, сохранённый в этом конструкторе.") }
    if (uploadRef.current) uploadRef.current.value = ""
  }

  async function askAdvisor(text: string) {
    if (busy || !variant || !validated.success || !text.trim()) return
    setBusy(true); setAdviceError("")
    const controller = new AbortController()
    adviceAbort.current = controller
    const timeout = setTimeout(() => controller.abort(), 45_000)
    try {
      const response = await fetch("/api/vent-advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, variantId: variant.id, question: text.trim() }), signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Не удалось получить ответ")
      setAdvice({ answer: data.answer, source: data.source, signature })
      setQuestion("")
    } catch (error) {
      if (controller.signal.aborted) setAdviceError("Ответ занял слишком много времени. Попробуйте ещё раз.")
      else setAdviceError(error instanceof Error ? error.message : "Не удалось связаться с помощником")
    } finally { clearTimeout(timeout); setBusy(false) }
  }

  function submitQuestion(event: FormEvent) { event.preventDefault(); void askAdvisor(question) }

  return <div className="vent-studio">
    <header className="vc-header vc-no-print">
      <Link href="/" className="vc-brand" aria-label="SUNBUR — на главную"><BrandMark className="vc-brand-icon" />SUNBUR<span className="vc-brand-divider" /> <span className="vc-brand-sub">инструменты для вашего дома</span></Link>
      <Link className="vc-back" href="/uslugi/produhi-v-fundamente"><ArrowLeft size={15} /> Об услуге</Link>
    </header>

    <main className="vc-main">
      <nav className="vc-breadcrumbs vc-no-print" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><span aria-current="page">Калькулятор продухов</span></nav>
      <div className="vc-intro">
        <div><div className="vc-eyebrow"><span /> ПРОЕКТИРУЕМ ПОНЯТНО</div><h1>Конструктор продухов<span>.</span></h1><p>Соберите свой фундамент. Найдите подходящий диаметр и оцените стоимость.</p></div>
        <div className="vc-project-actions vc-no-print">
          <button className="vc-button" onClick={() => uploadRef.current?.click()}><FileUp size={16} /> Открыть</button>
          <button className="vc-button vc-button-dark" disabled={!result} onClick={downloadProject}><Download size={16} /> Сохранить проект</button>
          <input ref={uploadRef} className="vc-hidden" type="file" accept=".json,application/json" aria-label="Открыть файл проекта" onChange={(event) => void importProject(event.target.files?.[0])} />
        </div>
      </div>
      <div className="vc-workflow vc-no-print"><span><b>01</b> Задайте фундамент</span><i /><span><b>02</b> Сравните варианты</span><i /><span><b>03</b> Сохраните схему</span><small>Предварительный расчёт</small></div>
      <div className="vc-notice vc-no-print" role="status">{notice}</div>

      <div className="vc-workspace">
        <aside className="vc-controls vc-panel vc-no-print" aria-label="Параметры фундамента">
          <div className="vc-panel-title"><h2><SlidersHorizontal size={16} /> Ваш фундамент</h2><button className="vc-icon-button" title="Сбросить параметры" aria-label="Сбросить параметры" onClick={() => { setInput(DEFAULT_FOUNDATION); setSelectedId(null); setSelectedWall(null); setAdvice(null); setNotice("Восстановлены исходные параметры") }}><RotateCcw size={15} /></button></div>
          <section className="vc-control-section"><h3>Форма в плане</h3><div className="vc-shapes">
            {(Object.keys(shapeNames) as FoundationInput["shape"][]).map((shape) => <button key={shape} aria-pressed={input.shape === shape} onClick={() => selectShape(shape)} className={input.shape === shape ? "is-active" : ""}><ShapeIcon shape={shape} /><span>{shapeNames[shape]}</span></button>)}
          </div></section>
          <section className="vc-control-section"><h3><Ruler size={15} /> Размеры по осям стен</h3><div className="vc-field-grid">
            {input.shape !== "custom" && <NumericField label="Длина" value={input.length} onChange={(v) => update("length", v)} min={2} max={40} />}
            {input.shape !== "custom" && <NumericField label="Ширина" value={input.width} onChange={(v) => update("width", v)} min={2} max={40} />}
            <NumericField label="Высота цоколя" value={input.height} onChange={(v) => update("height", v)} min={0.3} max={2.5} />
            <NumericField label="Толщина стены" value={input.thickness} onChange={(v) => update("thickness", v)} min={100} max={1000} step={10} unit="мм" />
          </div>{(input.shape === "l" || input.shape === "u") && <div className="vc-field-spaced"><NumericField label="Ширина крыла" value={input.wing} onChange={(v) => update("wing", v)} min={1} max={20} /><p className="vc-hint">Одинаковая ширина всех крыльев.</p></div>}
          {input.shape === "custom" && <div className="vc-field-spaced"><ContourEditor input={input} contour={input.contour} onChange={updateContour} /><p className="vc-hint">Габариты по осям: {number(input.length)} × {number(input.width)} м.</p></div>}</section>
          <section className="vc-control-section"><h3><Layers3 size={15} /> Внутренние стены</h3><div className="vc-partitions">
            {([{ id: "none", title: "Без стен", icon: "□" }, { id: "length", title: "Вдоль", icon: "⊟" }, { id: "width", title: "Поперёк", icon: "◫" }, { id: "cross", title: "Крест", icon: "⊞" }] as const).map((item) => <button key={item.id} aria-pressed={input.partitions === item.id} className={input.partitions === item.id ? "is-active" : ""} onClick={() => update("partitions", item.id)}><span aria-hidden="true">{item.icon}</span>{item.title}</button>)}
          </div><p className="vc-hint">По центру контура. Переточные отверстия считаются отдельно.</p></section>
          <section className="vc-control-section"><label className="vc-label" htmlFor="vc-material">Материал фундамента</label><div className="vc-select"><select id="vc-material" value={input.material} onChange={(event) => update("material", event.target.value as FoundationInput["material"])}>{materialOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></div>
            <div className="vc-range-label"><label htmlFor="vc-grille">Живое сечение решётки</label><strong>{input.grilleFreePercent}%</strong></div><input id="vc-grille" className="vc-range" type="range" min={10} max={100} step={5} value={input.grilleFreePercent} onChange={(e) => update("grilleFreePercent", Number(e.target.value))} /><p className="vc-hint">Доля открытой площади. Уточните в паспорте решётки; 100% — без решётки.</p>
          </section>
          <details className="vc-advanced"><summary><CircleHelp size={15} /> Условия расчёта <ChevronDown size={14} /></summary><div className="vc-advanced-content"><div className="vc-field-grid">
            <NumericField label="Площадь: 1 /" value={input.areaRatio} onChange={(v) => update("areaRatio", v)} min={100} max={1000} step={50} unit="" />
            <NumericField label="Макс. шаг" value={input.maxSpacing} onChange={(v) => update("maxSpacing", v)} min={0.5} max={5} />
            <NumericField label="Отступ от грани" value={input.cornerOffset} onChange={(v) => update("cornerOffset", v)} min={0.15} max={1.5} step={0.05} />
            <NumericField label="Высота центра (от низа цоколя)" value={input.ventHeight} onChange={(v) => update("ventHeight", v)} min={0.1} max={2.4} step={0.05} />
          </div><label className="vc-checkbox"><input type="checkbox" checked={input.underFloor} onChange={(e) => update("underFloor", e.target.checked)} /> Бурение из подпола с доплатой</label><p className="vc-hint">1/400 — типовое значение; на радоноопасных грунтах его ужесточают до 1/100–1/150. Шаг и отступ — параметры предварительного сценария. Высота центра отсчитывается от низа цоколя в модели, а не от уровня земли: на практике продухи держат не ниже ~0,3 м над грунтом, чтобы их не занесло снегом.</p></div></details>
        </aside>

        <div className="vc-model-column">
          <section className="vc-viewport vc-panel" aria-label="Модель фундамента">
            {result && !result.recommendedId && <div className="vc-warning vc-fit-warning" role="alert"><strong>Подходящая схема не найдена.</strong> Показана пробная раскладка с ограничениями. Проверьте высоту, отступы и размеры; причины указаны под вариантами.</div>}
            <div className="vc-viewport-toolbar vc-no-print"><div className="vc-view-switch" aria-label="Вид модели"><button className={view === "3d" ? "is-active" : ""} aria-pressed={view === "3d"} onClick={() => setView("3d")}><Box size={15} /> 3D-модель</button><button className={view === "plan" ? "is-active" : ""} aria-pressed={view === "plan"} onClick={() => setView("plan")}><Layers3 size={15} /> План сверху</button></div><button className={`vc-airflow ${airflow ? "is-active" : ""}`} aria-label="Направления воздуха" aria-pressed={airflow} onClick={() => setAirflow(!airflow)}><Wind size={16} /><span>Направления воздуха</span></button></div>
            {result ? <FoundationView input={input} geometry={result.geometry} variant={variant} selectedWall={selectedWall} onSelectWall={setSelectedWall} showAirflow={airflow} view={view} /> : <div className="vc-invalid" role="alert"><Ruler size={30} /><h3>Уточните размеры</h3>{!validated.success && validated.error.issues.map((issue, index) => <p key={index}>{issue.message}</p>)}</div>}
            <div className="vc-model-caption"><span><i className="vc-dot" /> Наружный продух</span><span><i className="vc-dot vc-dot-grey" /> Переточное отверстие</span><small>{airflow ? "Стрелки условные, без расчёта воздушного потока" : "Нажмите на стену, чтобы увидеть её отверстия"}</small></div>
            <div className="vc-stats" aria-live="polite"><div><span>Площадь контура</span><strong>{result ? number(result.geometry.area) : "—"}<small> м²</small></strong></div><div><span>Наружные продухи</span><strong>{variant?.externalCount ?? "—"}<small> шт.</small></strong></div><div><span>Выбранный диаметр</span><strong>{variant ? `Ø ${variant.diameterMm}` : "—"}<small> мм</small></strong></div><div><span>Бурение, ориентир</span><strong className="vc-price">{variant ? money(variant.finalPrice) : "—"}{variant && variant.discountPercent > 0 && <small className="vc-discount-badge">-{variant.discountPercent}%</small>}</strong>{variant && variant.discountPercent > 0 && <small className="vc-price-original">{money(variant.totalPrice)}</small>}</div></div>
          </section>
          <div className="vc-estimate-note"><CircleHelp size={17} /><p>Это предварительная схема для обсуждения с мастером. Расположение арматуры, несущую способность и условия вентиляции проверяет специалист перед бурением.</p></div>
        </div>
      </div>

      {result && variant && <>
        <section className="vc-results" aria-labelledby="vc-variants-title"><div className="vc-section-heading"><div><span className="vc-eyebrow">МЕНЬШЕ ОТВЕРСТИЙ ИЛИ НИЖЕ ЦЕНА?</span><h2 id="vc-variants-title">Сравните варианты</h2></div><p>Одна геометрия. Разные диаметры.<br />Минимум по площади: <strong>{number(result.requiredArea, 3)} м²</strong></p></div>
          <div className="vc-variants">{result.variants.map((item) => <button key={item.id} disabled={!item.feasible} aria-pressed={variant.id === item.id} onClick={() => setSelectedId(item.id)} className={`vc-variant ${variant.id === item.id ? "is-selected" : ""} ${!item.feasible ? "is-unavailable" : ""}`}>
            <span className="vc-variant-badge">{item.id === result.recommendedId ? <><Sparkles size={12} /> Выгоднее по расчёту</> : !item.feasible ? "Не помещается" : "Вариант"}</span>
            <span className="vc-variant-title"><strong>Ø {item.diameterMm}<small> мм</small></strong><i>{variant.id === item.id && <Check size={14} />}</i></span>
            <span className="vc-variant-count">{item.externalCount} наружных{item.internalCount ? ` + ${item.internalCount} внутренних` : " отверстий"}</span>
            <span className="vc-variant-price">{money(item.finalPrice)}{item.discountPercent > 0 && <span className="vc-discount-badge">-{item.discountPercent}%</span>}{item.discountPercent > 0 && <span className="vc-price-original">{money(item.totalPrice)}</span>}</span>
            {item.discountPercent > 0 && <span className="vc-variant-savings">Экономия {money(item.discountAmount)}</span>}
            <span className="vc-variant-area">{number(item.freeArea, 3)} м² свободного сечения</span>
          </button>)}</div>
          <p className="vc-hint vc-pricing-note">Стоимость включает бурение всех показанных отверстий{result.variants.some((item) => item.discountPercent > 0) ? " и скидку за количество отверстий" : ""}. Решётки, гильзы, доставка и дополнительные работы не включены. «Выгоднее» — минимум среди рассчитанных диаметров при заданных условиях.</p>
          {(!variant.feasible || variant.warnings.length > 0) && <div className="vc-warning" role="status">{variant.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
        </section>

        <div className="vc-bottom-grid">
          <section className="vc-panel vc-placement"><div className="vc-panel-title"><h2><Ruler size={17} /> Схема размещения</h2><button className="vc-button vc-no-print" onClick={() => window.print()}><Printer size={15} /> Печать / PDF</button></div>
            <div className="vc-wall-filter vc-no-print"><label htmlFor="vc-wall">Выберите стену</label><div className="vc-select"><select id="vc-wall" value={selectedWall ?? ""} onChange={(event) => setSelectedWall(event.target.value || null)}><option value="">Все стены</option>{result.geometry.walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.label}{wall.internal ? " · внутренняя" : ""}</option>)}</select><ChevronDown size={14} /></div></div>
            <div className="vc-table-wrap"><table><thead><tr><th>Стена</th><th>Длина</th><th>Центры от начала стены, м</th></tr></thead><tbody>{result.geometry.walls.map((wall) => { const vents = variant.vents.filter((vent) => vent.wallId === wall.id).sort((a, b) => a.offset - b.offset); return <tr key={wall.id} className={selectedWall && wall.id !== selectedWall ? "vc-filtered-wall" : undefined}><td><strong>{wall.label}</strong><small>{wall.internal ? "Внутренняя" : "Наружная"}</small><small className="vc-print-origin">Начало X {number(wall.start.x)}, Z {number(wall.start.z)}; конец X {number(wall.end.x)}, Z {number(wall.end.z)} м</small></td><td>{number(Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z))} м</td><td>{vents.length ? vents.map((vent) => number(vent.offset, 2)).join(" · ") : "Нет отверстий"}</td></tr> })}</tbody></table></div>
            {chosenWall && <p className="vc-table-note">Начало выбранной стены: X {number(chosenWall.start.x)} м, Z {number(chosenWall.start.z)} м. Конец: X {number(chosenWall.end.x)} м, Z {number(chosenWall.end.z)} м.</p>}
            <p className="vc-table-note">Размеры по осям стен. Центр отверстий — {number(input.ventHeight)} м от низа цоколя в модели (не от уровня земли). Во внешнюю площадь входят только наружные продухи. Полные координаты X/Z — в файле проекта.</p>
          </section>

          <section className="vc-advisor vc-panel vc-no-print" aria-labelledby="vc-advisor-title"><div className="vc-advisor-heading"><span className="vc-bot"><Sparkles size={23} /></span><div><h2 id="vc-advisor-title">Разберём ваш проект</h2><p>Бит · помощник SUNBUR</p></div><span className="vc-advisor-tag">AI</span></div>
            <p className="vc-advisor-intro">Объясню расчёт, сравню варианты и подскажу, какие данные уточнить перед бурением. Параметры модели уже под рукой.</p>
            <div className="vc-suggestions">{["Как сделать дешевле?", "Почему столько продухов?", "Что проверить до бурения?"].map((text) => <button key={text} disabled={busy} onClick={() => void askAdvisor(text)}>{text}<ArrowUpRight size={13} /></button>)}</div>
            {advice && <div className="vc-advice" role="status"><span className="vc-answer-source">{advice.source === "llm" ? "Ответ LLM по вашему расчёту" : "Разбор по формулам · LLM не подключена"}</span>{advice.signature !== signature && <p className="vc-stale">Параметры изменились. Задайте вопрос снова для актуального разбора.</p>}<p>{advice.answer}</p></div>}
            {adviceError && <p className="vc-warning" role="alert">{adviceError}</p>}
            <form onSubmit={submitQuestion} className="vc-ask"><label className="vc-hidden" htmlFor="vc-question">Вопрос о проекте</label><textarea id="vc-question" maxLength={1200} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Например, можно ли уменьшить число отверстий?" /><button aria-label="Отправить вопрос" disabled={busy || !question.trim()} type="submit">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></form><p className="vc-hint">{busy ? "Изучаю параметры вашего проекта…" : "Помощник получает параметры проекта после отправки вопроса."}</p>
          </section>
        </div>

        <details className="vc-methodology"><summary>Как устроен расчёт и что он учитывает <Plus size={16} /></summary><div><p>Расчётная площадь = площадь контура / {input.areaRatio}. Свободное сечение одного отверстия = π × (диаметр / 2)² × {input.grilleFreePercent}%. Подбор дополнительно учитывает распределение по стенам, шаг, отступы и внутренние перемычки.</p>{result.notes.map((note, index) => <p key={index}>{note}</p>)}<h3>Источники и область применения</h3>{CALCULATION_SOURCES.map((source) => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13} /></a>{source.note && <> — {source.note}</>}</p>)}</div></details>
        <div className="vc-print-summary"><h2>Параметры расчёта SUNBUR</h2><p>{shapeNames[input.shape]}, {input.length} × {input.width} м; высота {input.height} м; стена {input.thickness} мм. Материал: {materialOptions.find((item) => item.value === input.material)?.label}. Сечение решётки {input.grilleFreePercent}%; площадь 1/{input.areaRatio}; максимальный шаг {input.maxSpacing} м; отступ {input.cornerOffset} м.</p><p>Сечение наружных продухов: {number(variant.freeArea, 3)} м² при расчётной цели {number(result.requiredArea, 3)} м². Всего {variant.totalCount} отверстий Ø{variant.diameterMm} мм. Бурение: {money(variant.finalPrice)}{variant.discountPercent > 0 ? ` (со скидкой ${variant.discountPercent}% за количество; без скидки ${money(variant.totalPrice)})` : ""}, без решёток, гильз и доставки.</p>{result.notes.map((note, index) => <p key={index}>{note}</p>)}</div>
      </>}
      {children}
      <footer className="vc-footer"><Link href="/">SUNBUR<span> · алмазное бурение</span></Link><span>От идеи — к точному отверстию.</span><Link className="vc-no-print" href="/#contacts">Обсудить с мастером <ArrowRight size={14} /></Link></footer>
    </main>
  </div>
}
