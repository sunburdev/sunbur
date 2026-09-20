"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, Download, Loader2, Plus, Printer, RotateCcw, Send, Sparkles, Trash2, Upload } from "lucide-react"
import { calculateHomeTool, defaultRow, defaultToolInput, fmt, money, toolInputSchema, type EstimateRow, type PhotoMarker, type ToolInput } from "@/lib/home-tools"
import { equipmentCatalog, toolsCatalog, toolPath, type ToolId } from "@/lib/tools-catalog"
import { materialOptions, priceRates } from "@/lib/site-data"
import { ToolDiagram } from "./tool-diagram"
import { ToolPrintParameters } from "./tool-print-parameters"
import { NumberField } from "./tool-number-field"
import { ToolExtraFields } from "./tool-extra-fields"
import { ToolDiameterFields, ToolDiameterComparison } from "./tool-diameter-selection"
function MaterialField({ value, onChange }: { value: string; onChange: (value: EstimateRow["material"]) => void }) {
  return <label className="tools-field"><span>Материал</span><select value={value} onChange={event => onChange(event.target.value as EstimateRow["material"])}>{materialOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
}
function DiameterField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="tools-field"><span>Диаметр</span><select value={value} onChange={event => onChange(Number(event.target.value))}>{priceRates.map(item => <option key={item.diameterMm} value={item.diameterMm}>Ø {item.diameterMm} мм</option>)}</select></label>
}
function WorkFields({ value, onChange }: { value: Pick<EstimateRow, "depth" | "material" | "atHeight" | "underFloor">; onChange: (patch: object) => void }) {
  return <><div className="tools-field-grid"><MaterialField value={value.material} onChange={material => onChange({ material })} /><NumberField label="Толщина стены" value={value.depth} onChange={depth => onChange({ depth })} min={50} max={2000} unit="мм" /></div><div className="tools-checks"><label><input type="checkbox" checked={value.atHeight} onChange={e => onChange({ atHeight: e.target.checked })} /> На высоте</label><label><input type="checkbox" checked={value.underFloor} onChange={e => onChange({ underFloor: e.target.checked })} /> В подполе</label></div></>
}

export function ToolStudio({ id }: { id: ToolId }) {
  const tool = toolsCatalog.find(item => item.id === id)!
  const [input, setInput] = useState<ToolInput>(() => defaultToolInput(id))
  const [notice, setNotice] = useState("")
  const [image, setImage] = useState("")
  const [includePhoto, setIncludePhoto] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState(0)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [answer, setAnswer] = useState<{ text: string; input: ToolInput; image: string; includePhoto: boolean } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const photoFile = useRef<HTMLInputElement>(null)
  const projectFile = useRef<HTMLInputElement>(null)
  const photoVersion = useRef(0)
  const parsed = toolInputSchema.safeParse(input)
  const result = parsed.success ? calculateHomeTool(parsed.data) : null
  const currentAnswer = answer?.input === input && answer.image === image && answer.includePhoto === includePhoto ? answer.text : ""
  const patch = (changes: object) => setInput(previous => ({ ...previous, ...changes } as ToolInput))
  const rowPatch = (index: number, changes: object) => {
    if (input.kind === "estimate") patch({ rows: input.rows.map((row, i) => i === index ? { ...row, ...changes } : row) })
  }
  const markerPatch = (index: number, changes: object) => {
    if (input.kind === "photo") patch({ markers: input.markers.map((marker, i) => i === index ? { ...marker, ...changes } : marker) })
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`sunbur-tool-${id}`)
      if (saved) {
        const data = toolInputSchema.safeParse(JSON.parse(saved))
        if (data.success && data.data.kind === id) { setInput(data.data); setNotice(id === "photo" ? "Восстановлены сохранённые параметры. Фото при необходимости загрузите заново." : "Восстановлены сохранённые параметры. Для нового расчёта нажмите «Сбросить параметры».") }
      }
    } catch { /* Storage may be unavailable. */ }
    const abort = new AbortController()
    fetch("/api/tool-advice", { signal: abort.signal }).then(response => response.json()).then(data => setConfigured(data.configured === true)).catch(() => {})
    return () => { abort.abort(); controller.current?.abort(); photoVersion.current++ }
  }, [id])
  useEffect(() => { controller.current?.abort(); setBusy(false); setError("") }, [input, image, includePhoto])

  async function ask(prompt: string) {
    if (!result || busy || !prompt.trim()) return
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/tool-advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, question: prompt.trim(), ...(input.kind === "photo" && includePhoto && image ? { image } : {}) }), signal: abort.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Не удалось получить ответ.")
      if (!abort.signal.aborted) { setAnswer({ text: data.answer, input, image, includePhoto }); setQuestion(""); setConfigured(true) }
    } catch (err) { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Ошибка подключения.") }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }

  function save() {
    if (!result) return
    try { localStorage.setItem(`sunbur-tool-${id}`, JSON.stringify(input)) } catch { /* File export still works. */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, input, ...(image ? { image } : {}) }, null, 2)], { type: "application/json" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sunbur-${tool.slug}.json`; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice("Файл проекта подготовлен. Его можно открыть здесь и продолжить работу.")
  }
  async function loadProject(file?: File) {
    if (!file) return
    try {
      if (file.size > 2_500_000) throw new Error("Файл проекта слишком большой.")
      const data = JSON.parse(await file.text())
      const value = toolInputSchema.safeParse(data.input)
      if (data.version !== 1 || !value.success || value.data.kind !== id) throw new Error("Это не проект текущего инструмента.")
      if (data.image && (typeof data.image !== "string" || data.image.length > 2_200_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data.image) || id !== "photo")) throw new Error("Некорректное фото в проекте.")
      photoVersion.current++; setUploading(false); setInput(value.data); setImage(data.image || ""); setIncludePhoto(false); setSelectedMarker(0); setNotice("Проект открыт.")
    } catch (err) { setNotice(err instanceof Error ? err.message : "Не удалось открыть проект.") }
  }
  async function loadPhoto(file?: File) {
    if (!file) return
    const version = ++photoVersion.current
    setUploading(true)
    try {
      if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type) || file.size > 10_000_000) throw new Error("Выберите JPG, PNG или WebP до 10 МБ.")
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext("2d")!
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
      const data = canvas.toDataURL("image/jpeg", .82)
      if (data.length > 2_200_000) throw new Error("Не удалось уменьшить фото. Выберите изображение меньшего размера.")
      if (version !== photoVersion.current) return
      setImage(data); setIncludePhoto(false); patch({ markers: [] }); setSelectedMarker(0); setNotice("Фото готово. Нажмите на изображение, чтобы добавить метку. Предыдущие метки удалены.")
    } catch (err) { if (version === photoVersion.current) setNotice(err instanceof Error ? err.message : "Не удалось открыть фотографию.") }
    finally { if (version === photoVersion.current) setUploading(false) }
  }
  function addMarker(x = 50, y = 50) {
    if (input.kind !== "photo" || input.markers.length >= 30 || !image) return
    setSelectedMarker(input.markers.length)
    patch({ markers: [...input.markers, { x, y, diameter: 132, depth: 300, material: "concrete", note: "" }] })
  }

  return <>
    <div className="tools-title-row"><div><span className="tools-eyebrow">{tool.category} / SUNBUR</span><h1>{tool.title}</h1><p>{tool.description}</p></div><div className="tools-toolbar tools-no-print"><button onClick={() => projectFile.current?.click()}><Upload size={16} />Открыть</button><button onClick={save} disabled={!result}><Download size={16} />Сохранить</button><button onClick={() => window.print()} disabled={!result}><Printer size={16} />PDF</button></div></div>
    <input type="file" accept=".json,application/json" hidden ref={projectFile} onChange={e => { void loadProject(e.target.files?.[0]); e.target.value = "" }} />
    <div className="tools-tabs tools-no-print" aria-label="Другие инструменты">{toolsCatalog.map(item => <Link key={item.id} href={toolPath(item.id)} aria-current={item.id === id ? "page" : undefined}>{item.short}</Link>)}</div>
    {notice && <p className="tools-notice tools-no-print" role="status">{notice}</p>}
    {result && <ToolPrintParameters input={input} />}
    <div className="tools-workspace">
      <section className="tools-controls"><div className="tools-panel-title"><h2>01 <span>Ваши параметры</span></h2><button className="tools-icon-button tools-no-print" aria-label="Сбросить параметры" onClick={() => { setInput(defaultToolInput(id)); photoVersion.current++; setUploading(false); setImage(""); setIncludePhoto(false); setSelectedMarker(0); setNotice("Параметры сброшены.") }}><RotateCcw size={17} /></button></div>
        {input.kind === "diameter" && <><ToolDiameterFields input={input} patch={patch} /><hr /><WorkFields value={input} onChange={patch} /></>}
        {input.kind === "slope" && <><NumberField label="Горизонтальная длина трассы" value={input.length} onChange={length => patch({ length })} min={.1} max={100} unit="м" step={.1} /><NumberField label="Проектный уклон" value={input.slope} onChange={slope => patch({ slope })} min={0} max={15} unit="см/м" step={.1} /><p className="tools-hint">2 см/м — пример. Задайте уклон из проекта; допустимость зависит от системы.</p><NumberField label="Глубина оси в начале" value={input.startDepth} onChange={startDepth => patch({ startDepth })} min={0} max={500} unit="см" step={.1} /><NumberField label="Наружный диаметр трубы" value={input.pipe} onChange={pipe => patch({ pipe })} min={32} max={315} unit="мм" step={.1} /></>}
        {input.kind === "equipment" && <><label className="tools-field"><span>Прибор</span><select value={input.model} onChange={e => patch({ model: e.target.value })}>{equipmentCatalog.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}<option value="custom">Другой прибор</option></select></label>{input.model === "custom" ? <NumberField label="Отверстие по инструкции" value={input.customDiameter} onChange={customDiameter => patch({ customDiameter })} min={20} max={500} unit="мм" /> : <div className="tools-source"><span>Размер из документации</span><strong>Ø {equipmentCatalog.find(model => model.id === input.model)!.diameter} мм</strong><a href={equipmentCatalog.find(model => model.id === input.model)!.source} target="_blank" rel="noreferrer">Открыть источник ↗</a></div>}<WorkFields value={input} onChange={patch} /></>}
        {input.kind === "estimate" && <><p className="tools-hint">Одна позиция — одинаковые диаметр, материал и условия. До 30 позиций.</p>{input.rows.map((row, i) => <fieldset className="tools-row-editor" key={i}><legend>Позиция {i + 1}</legend><div className="tools-field-grid"><DiameterField value={row.diameter} onChange={diameter => rowPatch(i, { diameter })} /><NumberField label="Количество" value={row.quantity} onChange={quantity => rowPatch(i, { quantity })} min={1} max={100} unit="шт." step={1} /></div><WorkFields value={row} onChange={changes => rowPatch(i, changes)} /><button className="tools-text-button tools-no-print" disabled={input.rows.length === 1} onClick={() => patch({ rows: input.rows.filter((_, index) => index !== i) })}><Trash2 size={14} />Удалить позицию {i + 1}</button></fieldset>)}<button className="tools-add tools-no-print" disabled={input.rows.length >= 30} onClick={() => patch({ rows: [...input.rows, { ...defaultRow }] })}><Plus size={17} />Добавить позицию</button></>}
        {input.kind === "moisture" && <><h3>Воздух в подполе</h3><div className="tools-field-grid"><NumberField label="Температура внутри" value={input.insideTemp} onChange={insideTemp => patch({ insideTemp })} min={0} max={50} unit="°C" step={.1} /><NumberField label="Влажность внутри" value={input.insideHumidity} onChange={insideHumidity => patch({ insideHumidity })} min={1} max={100} unit="%" step={.1} /></div><h3>Наружный воздух</h3><div className="tools-field-grid"><NumberField label="Температура снаружи" value={input.outsideTemp} onChange={outsideTemp => patch({ outsideTemp })} min={0} max={50} unit="°C" step={.1} /><NumberField label="Влажность снаружи" value={input.outsideHumidity} onChange={outsideHumidity => patch({ outsideHumidity })} min={1} max={100} unit="%" step={.1} /></div><hr /><NumberField label="Самая холодная поверхность" value={input.surfaceTemp} onChange={surfaceTemp => patch({ surfaceTemp })} min={0} max={50} unit="°C" step={.1} /><p className="tools-hint">Температура поверхности измеряется отдельно. Для отрицательных температур эта модель не применяется.</p><a className="tools-source-link" href="https://www.vaisala.com/en/expert-article/dew-point-temperature-what-does-it-mean-and-how-can-it-be-calculated" target="_blank" rel="noreferrer">Как связаны влажность и точка росы ↗</a></>}
        {input.kind === "photo" && <><input type="file" ref={photoFile} hidden accept="image/jpeg,image/png,image/webp" onChange={e => { void loadPhoto(e.target.files?.[0]); e.target.value = "" }} /><button className="tools-add tools-no-print" disabled={uploading} onClick={() => photoFile.current?.click()}>{uploading ? <Loader2 size={18} className="tools-spin" /> : <Upload size={18} />}{image ? "Заменить фото" : "Загрузить фото"}</button><p className="tools-hint">JPG, PNG или WebP до 10 МБ. При замене фото метки сбрасываются.</p><button className="tools-add tools-no-print" disabled={!image || input.markers.length >= 30} onClick={() => addMarker()}><Plus size={17} />Добавить метку по центру</button><div className="tools-marker-list tools-no-print">{input.markers.map((_, i) => <button key={i} aria-pressed={selectedMarker === i} onClick={() => setSelectedMarker(i)}>{i + 1}</button>)}</div>{input.markers[selectedMarker] && (() => { const marker = input.markers[selectedMarker]; return <fieldset className="tools-row-editor"><legend>Отверстие {selectedMarker + 1}</legend><DiameterField value={marker.diameter} onChange={diameter => markerPatch(selectedMarker, { diameter })} /><div className="tools-field-grid"><MaterialField value={marker.material} onChange={material => markerPatch(selectedMarker, { material })} /><NumberField label="Толщина" value={marker.depth} onChange={depth => markerPatch(selectedMarker, { depth })} min={50} max={2000} unit="мм" /></div><div className="tools-field-grid"><NumberField label="Слева на фото" value={marker.x} onChange={x => markerPatch(selectedMarker, { x })} min={0} max={100} unit="%" step={.1} /><NumberField label="Сверху на фото" value={marker.y} onChange={y => markerPatch(selectedMarker, { y })} min={0} max={100} unit="%" step={.1} /></div><label className="tools-field"><span>Назначение и размеры от ориентиров</span><textarea maxLength={240} value={marker.note} onChange={e => markerPatch(selectedMarker, { note: e.target.value })} placeholder="Например: вытяжка, центр 30 см от потолка" /></label><button className="tools-text-button tools-no-print" onClick={() => { patch({ markers: input.markers.filter((_, i) => i !== selectedMarker) }); setSelectedMarker(0) }}><Trash2 size={14} />Удалить метку</button></fieldset> })()}<label className="tools-field"><span>Общие примечания мастеру</span><textarea maxLength={1500} value={input.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Доступ к стене, назначение отверстий, известные размеры…" /></label></>}
        <ToolExtraFields input={input} patch={patch} />
      </section>
      <div className="tools-results">
        <section className="tools-preview"><div className="tools-panel-title"><h2>02 <span>{id === "photo" ? "Ваша схема" : "Наглядный расчёт"}</span></h2><span className="tools-badge">Предварительно</span></div>
          {input.kind === "photo" && image ? <div className="tools-photo" onClick={event => { if (event.target !== event.currentTarget && (event.target as HTMLElement).closest("button")) return; const box = event.currentTarget.getBoundingClientRect(); addMarker(Math.min(100, Math.max(0, (event.clientX - box.left) / box.width * 100)), Math.min(100, Math.max(0, (event.clientY - box.top) / box.height * 100))) }}><img src={image} alt="Загруженная фотография места работ" draggable={false} />{input.markers.map((marker, i) => <button key={i} aria-label={`Выбрать отверстие ${i + 1}`} aria-pressed={selectedMarker === i} className="tools-photo-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} onClick={event => { event.stopPropagation(); setSelectedMarker(i) }}>{i + 1}</button>)}</div> : result ? <ToolDiagram input={input} /> : <div className="tools-empty" role="status">Проверьте выделенные параметры, чтобы увидеть расчёт.</div>}
          {input.kind === "photo" && <p className="tools-hint tools-photo-hint">Нажмите на фото, чтобы добавить отверстие, или используйте кнопку слева. Координаты меток — в процентах от изображения.</p>}
          {result && <div className="tools-metrics">{result.metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>}
        </section>
        {result && input.kind === "diameter" && <ToolDiameterComparison input={input} result={result} onSelect={preferredDiameter => patch({ preferredDiameter })} />}
        {result && <section className="tools-summary"><h3>{result.summary}</h3><ul>{result.notes.map(note => <li key={note}>{note}</li>)}</ul></section>}
        {result && input.kind === "estimate" && (() => {
          const { subtotal, total, discountPercent, discountAmount } = result.data as { subtotal: number; total: number; discountPercent: number; discountAmount: number }
          return <div className="tools-table-wrap"><table><caption>Детализация сметы</caption><thead><tr><th>Позиция</th><th>Параметры</th><th>Кол-во</th><th>За одно</th><th>Сумма</th></tr></thead><tbody>{(result.data.rows as (EstimateRow & { unitPrice: number; total: number })[]).map((row, i) => <tr key={i}><td>{i + 1}</td><td>Ø{row.diameter} · {row.depth} мм · {materialOptions.find(m => m.value === row.material)?.label}{row.atHeight && " · на высоте"}{row.underFloor && " · в подполе"}</td><td>{row.quantity}</td><td>{money(row.unitPrice)}</td><td>{money(row.total)}</td></tr>)}</tbody>
            <tfoot>
              {discountPercent > 0 && <tr><td colSpan={4}>Без скидки</td><td>{money(subtotal)}</td></tr>}
              {discountPercent > 0 && <tr><td colSpan={4}>Скидка за количество ({discountPercent}%)</td><td>−{money(discountAmount)}</td></tr>}
              <tr><td colSpan={4}><strong>Итого к оплате</strong></td><td><strong>{money(total)}</strong></td></tr>
            </tfoot>
          </table></div>
        })()}
        {input.kind === "photo" && input.markers.length > 0 && <div className="tools-table-wrap"><table><caption>Задание по меткам</caption><thead><tr><th>№</th><th>Отверстие</th><th>Примечание</th></tr></thead><tbody>{input.markers.map((m: PhotoMarker, i) => <tr key={i}><td>{i + 1}</td><td>Ø{m.diameter} · {m.depth} мм · {materialOptions.find(item => item.value === m.material)?.label}</td><td>{m.note || "Уточнить на объекте"}</td></tr>)}</tbody></table></div>}
        <section className="tools-ai" aria-labelledby="tools-ai-title"><div className="tools-ai-heading"><span className="tools-ai-icon"><Sparkles size={23} /></span><div><span className="tools-eyebrow">БИТ · AI-ПОМОЩНИК SUNBUR</span><h2 id="tools-ai-title">Разберём вашу задачу</h2></div></div><p className="tools-ai-description">{id === "photo" ? "Помогу составить задание по вашим меткам и найти недостающие данные." : "Объясню результат, помогу сравнить варианты и подскажу, что уточнить до начала работ."}</p>
          <div className="tools-no-print">{configured === false && <p className="tools-ai-unavailable" role="status">AI-помощник пока не подключён. Расчёт работает; вопрос можно обсудить с мастером.</p>}
          {input.kind === "photo" && image && <label className="tools-photo-consent"><input type="checkbox" checked={includePhoto} onChange={e => setIncludePhoto(e.target.checked)} />Отправить это фото AI-помощнику вместе с вопросом. Без отметки будут переданы только параметры и текст.</label>}
          <div className="tools-ai-actions"><button className="tools-primary" disabled={!result || busy || configured === false || (input.kind === "photo" && input.markers.length === 0)} onClick={() => void ask(tool.question)}>{busy ? <Loader2 className="tools-spin" size={17} /> : <Sparkles size={17} />}{id === "photo" ? "Составить задание с AI" : "Разобрать результат с AI"}</button>{busy && <button onClick={() => { controller.current?.abort(); setBusy(false) }}>Отменить</button>}</div>
          <form onSubmit={e => { e.preventDefault(); void ask(question) }} className="tools-question"><label htmlFor="tools-question" className="tools-sr-only">Вопрос AI-помощнику</label><textarea id="tools-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={1200} placeholder="Или задайте свой вопрос по расчёту…" rows={2} /><button aria-label="Отправить вопрос" disabled={!question.trim() || !result || busy || configured === false}><Send size={19} /></button></form><p className="tools-hint">Параметры передаются помощнику только при отправке вопроса.</p></div>
          {busy && <p role="status" className="tools-ai-loading">Изучаю ваши параметры…</p>}{error && <p role="alert" className="tools-field-error">{error}</p>}{currentAnswer && <div className="tools-ai-answer" aria-live="polite"><span className="tools-eyebrow">ОТВЕТ AI · ПО ТЕКУЩИМ ПАРАМЕТРАМ</span><p>{currentAnswer}</p></div>}
        </section>
        <div className="tools-result-actions tools-no-print"><button onClick={() => window.print()} disabled={!result}><Printer size={17} />Печать / сохранить PDF</button><Link href="/#contacts">Обсудить с мастером<ArrowRight size={17} /></Link></div>
      </div>
    </div>
  </>
}
