import type { ToolInput } from "@/lib/home-tools"
import { NumberField } from "./tool-number-field"

const validDimension = (value: number, fallback: number) => Number.isFinite(value) && value >= 40 && value <= 2000 ? value : fallback

export function ToolExtraFields({ input, patch }: { input: ToolInput; patch: (changes: object) => void }) {
  if (input.kind === "angle") return <>
    <NumberField label="Толщина стены по перпендикуляру" value={input.wall} onChange={wall => patch({ wall })} min={50} max={2000} unit="мм" />
    <NumberField label="Угол от перпендикуляра" value={input.angle} onChange={angle => patch({ angle })} min={0} max={75} unit="°" />
    <div className="tools-presets tools-no-print" aria-label="Примеры угла">{[0, 15, 30, 45].map(angle => <button key={angle} aria-pressed={input.angle === angle} onClick={() => patch({ angle })}>{angle}°</button>)}</div>
    <p className="tools-hint">0° — прямо через стену. Увеличение угла удлиняет проход и смещает выход.</p>
    <NumberField label="Диаметр коронки" value={input.bore} onChange={bore => patch({ bore })} min={20} max={500} unit="мм" />
  </>
  if (input.kind === "airflow") return <>
    <NumberField label="Расход воздуха" value={input.flow} onChange={flow => patch({ flow })} min={0} max={10000} unit="м³/ч" />
    <label className="tools-field"><span>Форма сечения</span><select value={input.shape} onChange={e => patch({ shape: e.target.value, ductDiameter: validDimension(input.ductDiameter, 125), ductWidth: validDimension(input.ductWidth, 200), ductHeight: validDimension(input.ductHeight, 100) })}><option value="round">Круглое</option><option value="rectangular">Прямоугольное</option></select></label>
    {input.shape === "round" ? <NumberField label="Внутренний диаметр" value={input.ductDiameter} onChange={ductDiameter => patch({ ductDiameter })} min={40} max={2000} unit="мм" /> : <div className="tools-field-grid">
      <NumberField label="Внутренняя ширина" value={input.ductWidth} onChange={ductWidth => patch({ ductWidth })} min={40} max={2000} unit="мм" />
      <NumberField label="Внутренняя высота" value={input.ductHeight} onChange={ductHeight => patch({ ductHeight })} min={40} max={2000} unit="мм" />
    </div>}
    <hr /><NumberField label="Целевая скорость" value={input.targetSpeed} onChange={targetSpeed => patch({ targetSpeed })} min={.1} max={20} unit="м/с" />
    <p className="tools-hint">3 м/с — пример для сравнения. Задайте проектную цель: расчёт не определяет допустимый шум или нужный воздухообмен.</p>
  </>
  if (input.kind === "sealant") return <>
    <NumberField label="Внутренний диаметр отверстия" value={input.hole} onChange={hole => patch({ hole })} min={10} max={1000} unit="мм" />
    <NumberField label="Наружный диаметр трубы" value={input.tube} onChange={tube => patch({ tube })} min={1} max={990} unit="мм" />
    {input.hole <= input.tube && <p className="tools-field-error" role="alert">Отверстие должно быть шире трубы, чтобы осталось место для герметика.</p>}
    <NumberField label="Суммарная глубина заполнения" value={input.fillDepth} onChange={fillDepth => patch({ fillDepth })} min={1} max={500} unit="мм" />
    <p className="tools-hint">Два шва по 10 мм → введите 20 мм. Здесь учитывается только слой герметика, а не вся толщина стены.</p>
    <div className="tools-field-grid"><NumberField label="Количество проходов" value={input.count} onChange={count => patch({ count })} min={1} max={100} unit="шт." step={1} /><NumberField label="Запас материала" value={input.waste} onChange={waste => patch({ waste })} min={0} max={100} unit="%" /></div>
    <NumberField label="Объём упаковки" value={input.pack} onChange={pack => patch({ pack })} min={10} max={20000} unit="мл" />
    <div className="tools-presets tools-no-print" aria-label="Примеры объёма упаковки">{[280, 310, 600].map(pack => <button key={pack} aria-pressed={input.pack === pack} onClick={() => patch({ pack })}>{pack} мл</button>)}</div>
  </>
  return null
}
