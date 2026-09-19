import { equipmentCatalog } from "@/lib/tools-catalog"
import { fmt, type ToolInput } from "@/lib/home-tools"
import { materialOptions } from "@/lib/site-data"

const labels: Record<string, string> = {
  preferredDiameter: "Выбор коронки, мм (0 — автоматически)",
  wall: "Толщина стены по перпендикуляру, мм", angle: "Угол от перпендикуляра, °", bore: "Диаметр коронки, мм", shape: "Форма сечения", flow: "Расход воздуха, м³/ч", ductDiameter: "Внутренний диаметр, мм", ductWidth: "Внутренняя ширина, мм", ductHeight: "Внутренняя высота, мм", targetSpeed: "Целевая скорость, м/с", hole: "Внутренний диаметр отверстия, мм", tube: "Наружный диаметр трубы, мм", fillDepth: "Суммарная глубина заполнения, мм", count: "Количество проходов", waste: "Запас материала, %", pack: "Объём упаковки, мл",
  pipe: "Наружный диаметр трубы, мм", insulation: "Изоляция на сторону, мм", sleeve: "Стенка гильзы, мм", clearance: "Зазор на сторону, мм", depth: "Толщина стены, мм", material: "Материал", atHeight: "На высоте", underFloor: "В подполе", length: "Горизонтальная длина трассы, м", slope: "Уклон, см/м", startDepth: "Глубина оси в начале, см", model: "Прибор", customDiameter: "Диаметр по инструкции, мм", insideTemp: "Температура внутри, °C", insideHumidity: "Влажность внутри, %", outsideTemp: "Температура снаружи, °C", outsideHumidity: "Влажность снаружи, %", surfaceTemp: "Температура поверхности, °C", notes: "Примечания мастеру",
}
export function ToolPrintParameters({ input }: { input: ToolInput }) {
  const fields = Object.entries(input).filter(([key, value]) => {
    if (key === "kind" || Array.isArray(value)) return false
    if (key === "customDiameter" && input.kind === "equipment" && input.model !== "custom") return false
    if (input.kind === "airflow" && (input.shape === "round" ? ["ductWidth", "ductHeight"].includes(key) : key === "ductDiameter")) return false
    return true
  })
  return <section className="tools-print-only"><h2>Исходные параметры</h2><dl>{fields.map(([key, value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{typeof value === "boolean" ? value ? "Да" : "Нет" : typeof value === "number" ? fmt(value, 3) : key === "shape" ? value === "round" ? "Круглое" : "Прямоугольное" : key === "material" ? materialOptions.find(item => item.value === value)?.label : key === "model" ? equipmentCatalog.find(item => item.id === value)?.name ?? "Другой прибор" : String(value) || "Не указаны"}</dd></div>)}</dl>{input.kind === "estimate" && <p>Размеры и условия каждой позиции приведены в детализации сметы.</p>}</section>
}
