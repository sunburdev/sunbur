import { fmt, money, type ToolInput, type ToolResult } from "@/lib/home-tools"
import { diameterSources, type DiameterOption } from "@/lib/diameter-catalog"
import { NumberField } from "./tool-number-field"

type DiameterInput = Extract<ToolInput, { kind: "diameter" }>

export function ToolDiameterFields({ input, patch }: { input: DiameterInput; patch: (changes: object) => void }) {
  // A geometry change starts a fresh automatic selection. Price-only edits keep the chosen size.
  const update = (changes: object) => patch({ ...changes, preferredDiameter: 0 })
  return <>
    <div className="tools-presets tools-no-print" aria-label="Примеры наружного диаметра">{[50, 110, 125, 160].map(pipe => <button key={pipe} aria-pressed={input.pipe === pipe} onClick={() => update({ pipe })}>Ø {pipe}</button>)}</div>
    <NumberField label="Наружный диаметр проходящей части" value={input.pipe} onChange={pipe => update({ pipe })} min={10} max={500} unit="мм" />
    <p className="tools-hint">Если через стену должен пройти раструб или фитинг, измерьте его максимальный наружный диаметр.</p>
    <NumberField label="Минимальный зазор на сторону" value={input.clearance} onChange={clearance => update({ clearance })} min={0} max={50} unit="мм" />
    <div className="tools-presets tools-no-print" aria-label="Примеры зазора на сторону">{[1, 5, 10].map(clearance => <button key={clearance} aria-pressed={input.clearance === clearance} onClick={() => update({ clearance })}>{clearance} мм</button>)}</div>
    <p className="tools-hint">Это примеры для сравнения, не нормативные допуски. Для Ø110 без дополнительных слоёв: Ø112 даёт 1 мм на сторону, Ø120 — 5 мм, Ø132 — 11 мм.</p>
    <div className="tools-field-grid"><NumberField label="Изоляция / сторону" value={input.insulation} onChange={insulation => update({ insulation })} min={0} max={100} unit="мм" /><NumberField label="Стенка гильзы" value={input.sleeve} onChange={sleeve => update({ sleeve })} min={0} max={30} unit="мм" /></div>
    <p className="tools-hint">Без изоляции и гильзы оставьте 0. При гильзе зазор выше — сумма внутренних и наружных зазоров на одной стороне. Для готовой гильзы можно ввести её наружный диаметр в первое поле, а стенку оставить 0.</p>
  </>
}

export function ToolDiameterComparison({ input, result, onSelect }: { input: DiameterInput; result: ToolResult; onSelect: (diameter: number) => void }) {
  const options = result.data.options as DiameterOption[]
  const near = options.filter(option => option.clearance >= 0).slice(0, 8).map(option => option.diameter)
  const visible = options.filter(option => near.includes(option.diameter) || option.diameter === result.data.minimum || option.diameter === result.data.selected || option.diameter === input.preferredDiameter)
  return <section className="tools-diameter-comparison" aria-labelledby="diameter-comparison-title">
    <div className="tools-panel-title"><h2 id="diameter-comparison-title"><span>Сравните коронки</span></h2><button className="tools-text-button tools-no-print" onClick={() => onSelect(0)} disabled={!input.preferredDiameter}>Автоподбор</button></div>
    <p className="tools-hint">Показан зазор после учёта трубы, изоляции и стенки гильзы. Выберите размер — схема и цена обновятся. Минимальный диаметр не обязательно означает минимальную цену.</p>
    {visible.length > 0 ? <div className="tools-diameter-options">{visible.map(option => <button key={option.diameter} className="tools-diameter-option" aria-label={`Выбрать коронку Ø${option.diameter} мм`} aria-pressed={result.data.selected === option.diameter} disabled={!option.fits} onClick={() => onSelect(option.diameter)}>
      <span className="tools-diameter-size">Ø {option.diameter} <small>мм</small></span>
      <span>{option.clearance < 0 ? "Узел не проходит" : `${fmt(option.clearance)} мм на сторону`}</span>
      <span className="tools-diameter-fit">{!option.fits ? "Мало для заданного зазора" : option.diameter === result.data.minimum ? "Минимальный по параметрам" : "Вмещает заданный узел"}</span>
      <span className="tools-diameter-price">{option.fits ? option.cost === null ? "Цена по запросу" : money(option.cost) : "—"}</span>
    </button>)}</div> : <p className="tools-hint">Размер узла больше коронок в справочнике. Обсудите индивидуальный вариант с мастером.</p>}
    <label className="tools-field tools-no-print"><span>Все размеры справочника</span><select value={input.preferredDiameter} onChange={event => onSelect(Number(event.target.value))}><option value={0}>Автоматически: минимальный по параметрам</option>{options.map(option => <option key={option.diameter} value={option.diameter} disabled={!option.fits}>Ø {option.diameter} мм{option.fits ? ` · зазор ${fmt(option.clearance)} мм / сторону` : " · недостаточный проход"}</option>)}</select></label>
    <p className="tools-hint">Размеры в справочнике не подтверждают наличие у SUNBUR. Цена показана только при точном совпадении с тарифом.</p>
    <details className="tools-diameter-sources tools-no-print"><summary>Откуда размеры и как выбрать зазор</summary>{diameterSources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><span>{source.note}</span></p>)}</details>
  </section>
}
