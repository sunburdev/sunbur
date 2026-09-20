import { z } from "zod"
import { applyQuantityDiscount, calculateHolePrice, priceRates } from "./site-data"
import { equipmentCatalog, type ToolId } from "./tools-catalog"
import { crownDiameters, diameterSources, type DiameterOption } from "./diameter-catalog"

const number = (min: number, max: number) => z.number().finite().min(min).max(max)
const material = z.enum(["brick", "concrete", "reinforced"])
const diameter = number(1, 250).refine(value => priceRates.some(rate => rate.diameterMm === value), "Выберите доступный диаметр")
const work = { material, depth: number(50, 2000), atHeight: z.boolean(), underFloor: z.boolean() }
export const estimateRowSchema = z.object({ ...work, diameter, quantity: number(1, 100).int() }).strict()
export const markerSchema = z.object({ x: number(0, 100), y: number(0, 100), diameter, depth: number(50, 2000), material, note: z.string().max(240) }).strict()
export const toolInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("angle"), wall: number(50, 2000), angle: number(0, 75), bore: number(20, 500) }).strict(),
  z.object({ kind: z.literal("airflow"), shape: z.enum(["round", "rectangular"]), flow: number(0, 10000), ductDiameter: number(40, 2000), ductWidth: number(40, 2000), ductHeight: number(40, 2000), targetSpeed: number(.1, 20) }).strict(),
  z.object({ kind: z.literal("sealant"), hole: number(10, 1000), tube: number(1, 990), fillDepth: number(1, 500), count: number(1, 100).int(), waste: number(0, 100), pack: number(10, 20000) }).strict().refine(value => value.hole > value.tube, { message: "Диаметр отверстия должен быть больше диаметра трубы", path: ["hole"] }),
  z.object({ kind: z.literal("diameter"), ...work, pipe: number(10, 500), insulation: number(0, 100), sleeve: number(0, 30), clearance: number(0, 50), preferredDiameter: z.number().refine(value => value === 0 || crownDiameters.some(size => size === value), "Выберите размер из справочника").default(0) }).strict(),
  z.object({ kind: z.literal("slope"), length: number(0.1, 100), slope: number(0, 15), startDepth: number(0, 500), pipe: number(32, 315) }).strict(),
  z.object({ kind: z.literal("equipment"), ...work, model: z.enum(["tion-4s", "vakio-kiv-pro", "custom"]), customDiameter: number(20, 500) }).strict(),
  z.object({ kind: z.literal("estimate"), rows: z.array(estimateRowSchema).min(1).max(30) }).strict(),
  z.object({ kind: z.literal("moisture"), insideTemp: number(0, 50), insideHumidity: number(1, 100), outsideTemp: number(0, 50), outsideHumidity: number(1, 100), surfaceTemp: number(0, 50) }).strict(),
  z.object({ kind: z.literal("photo"), markers: z.array(markerSchema).max(30), notes: z.string().max(1500) }).strict(),
])
export type ToolInput = z.infer<typeof toolInputSchema>
export type EstimateRow = z.infer<typeof estimateRowSchema>
export type PhotoMarker = z.infer<typeof markerSchema>
export const defaultRow: EstimateRow = { diameter: 132, depth: 300, material: "concrete", quantity: 1, atHeight: false, underFloor: false }
const workDefaults = { material: "concrete" as const, depth: 300, atHeight: false, underFloor: false }
export function defaultToolInput(kind: ToolId): ToolInput {
  switch (kind) {
    case "angle": return { kind, wall: 300, angle: 15, bore: 132 }
    case "airflow": return { kind, shape: "round", flow: 120, ductDiameter: 125, ductWidth: 200, ductHeight: 100, targetSpeed: 3 }
    case "sealant": return { kind, hole: 132, tube: 110, fillDepth: 20, count: 4, waste: 10, pack: 310 }
    case "diameter": return { kind, ...workDefaults, pipe: 110, insulation: 0, sleeve: 0, clearance: 1, preferredDiameter: 0 }
    case "slope": return { kind, length: 10, slope: 2, startDepth: 40, pipe: 110 }
    case "equipment": return { kind, ...workDefaults, model: "tion-4s", customDiameter: 132 }
    case "estimate": return { kind, rows: [{ ...defaultRow }] }
    case "moisture": return { kind, insideTemp: 18, insideHumidity: 75, outsideTemp: 26, outsideHumidity: 65, surfaceTemp: 12 }
    case "photo": return { kind, markers: [], notes: "" }
  }
}
export const fmt = (value: number, digits = 1) => value.toLocaleString("ru-RU", { maximumFractionDigits: digits })
export const money = (value: number) => `${fmt(value, 0)} ₽`
const price = (diameterMm: number, value: Pick<EstimateRow, "material" | "depth" | "atHeight" | "underFloor">) => calculateHolePrice({ diameterMm, material: value.material, depthMm: value.depth, atHeight: value.atHeight, underFloor: value.underFloor })
export type ToolResult = { metrics: { label: string; value: string }[]; summary: string; notes: string[]; data: Record<string, unknown> }
const priceNote = "Предварительная стоимость бурения по тарифам SUNBUR. Выезд, оборудование, расходные материалы для монтажа и непредусмотренные работы не включены."
const structureNote = "Место прохода, арматуру, коммуникации и возможность бурения проверяют на объекте."

// Magnus approximation over liquid water (0–50 °C); not a frost-point model.
export function dewPoint(temp: number, humidity: number) {
  const gamma = Math.log(humidity / 100) + 17.62 * temp / (243.12 + temp)
  return 243.12 * gamma / (17.62 - gamma)
}
const vaporPressure = (temp: number, humidity: number) => 6.112 * Math.exp(17.62 * temp / (243.12 + temp)) * humidity / 100

export function calculateHomeTool(raw: ToolInput): ToolResult {
  const input = toolInputSchema.parse(raw)
  switch (input.kind) {
    case "angle": {
      const radians = input.angle * Math.PI / 180
      const pathLength = input.wall / Math.cos(radians)
      const offset = input.wall * Math.tan(radians)
      const majorAxis = input.bore / Math.cos(radians)
      return { metrics: [{ label: "Длина прохода по оси", value: `${fmt(pathLength)} мм` }, { label: "Смещение центра выхода", value: `${fmt(offset)} мм` }, { label: "Большая ось на поверхности", value: `${fmt(majorAxis)} мм` }], summary: input.angle === 0 ? "Прямой проход: длина равна толщине стены, центры совпадают." : `При угле ${fmt(input.angle)}° от перпендикуляра проход длиннее толщины стены на ${fmt(pathLength - input.wall)} мм.`, notes: ["Длина = толщина / cos(угла); смещение = толщина × tan(угла). Для цилиндрического канала большая ось эллипса = диаметр / cos(угла), малая ось равна диаметру.", "Модель предполагает две плоские параллельные поверхности. Направление смещения задают на объекте; схема показывает его величину в одной плоскости.", "Цена наклонного бурения и допустимый угол согласуются отдельно: они зависят от оборудования и доступа.", structureNote], data: { pathLength, offset, majorAxis, minorAxis: input.bore } }
    }
    case "airflow": {
      const area = input.shape === "round" ? Math.PI * (input.ductDiameter / 1000) ** 2 / 4 : input.ductWidth * input.ductHeight / 1_000_000
      const speed = input.flow / 3600 / area
      const targetArea = input.flow / 3600 / input.targetSpeed
      const targetDiameter = Math.sqrt(4 * targetArea / Math.PI) * 1000
      return { metrics: [{ label: "Средняя скорость", value: `${fmt(speed, 2)} м/с` }, { label: "Свободное сечение", value: `${fmt(area * 10000, 1)} см²` }, { label: "Круглый канал при цели", value: input.flow === 0 ? "Нет расхода" : `Ø ${fmt(targetDiameter, 1)} мм` }], summary: input.flow === 0 ? "Расход равен нулю: скорость нулевая, размер канала по расходу не определяется." : `Скорость ${speed > input.targetSpeed ? "выше" : speed < input.targetSpeed ? "ниже" : "равна"} заданной цели ${fmt(input.targetSpeed)} м/с.`, notes: ["Скорость = расход в м³/ч / 3600 / площадь в м². Вычисленный диаметр — геометрический ориентир, без округления до стандартного размера.", "Цель — ваше допущение, а не норматив. Размер воздуховода не равен диаметру отверстия: учитывайте наружные размеры, изоляцию и монтажный зазор.", "Потери давления, решётки, повороты, шум и характеристики вентилятора не моделируются. По одной скорости нельзя подтвердить достаточность вентиляции."], data: { area, speed, targetArea, targetDiameter: input.flow === 0 ? null : targetDiameter } }
    }
    case "sealant": {
      const gap = (input.hole - input.tube) / 2
      const perHoleMl = Math.PI / 4 * (input.hole ** 2 - input.tube ** 2) * input.fillDepth / 1000
      const netMl = perHoleMl * input.count
      const totalMl = netMl * (1 + input.waste / 100)
      const packages = Math.ceil(totalMl / input.pack)
      return { metrics: [{ label: "Один проход без запаса", value: `${fmt(perHoleMl)} мл` }, { label: "Всего с запасом", value: `${fmt(totalMl)} мл` }, { label: "Упаковки по объёму", value: `${packages} шт.` }], summary: `Кольцевой зазор ${fmt(gap)} мм на сторону. Для ${input.count} проходов понадобится ${packages} упак. по ${fmt(input.pack)} мл.`, notes: ["Объём = π / 4 × (диаметр отверстия² − диаметр трубы²) × глубина. Все размеры в миллиметрах; 1000 мм³ = 1 мл. Отверстие и труба круглые, соосные.", "Глубина — суммарная толщина всех слоёв герметика вдоль трубы. Остальной объём прохода может занимать уплотнительный шнур или другая система.", "Запас задан вами. Расширение пены, усадка, неровности и недоступный остаток упаковки не рассчитываются отдельно.", "Проверьте допустимые ширину и глубину шва, совместимость материалов и условия применения по инструкции. Расчёт не подтверждает водонепроницаемость или огнестойкость узла."], data: { gap, perHoleMl, netMl, totalMl, packages, remainderMl: packages * input.pack - totalMl } }
    }
    case "diameter": {
      const assemblyDiameter = input.pipe + 2 * (input.insulation + input.sleeve)
      const required = assemblyDiameter + 2 * input.clearance
      const options: DiameterOption[] = crownDiameters.map(diameter => ({ diameter, clearance: (diameter - assemblyDiameter) / 2, fits: diameter >= required, cost: priceRates.some(row => row.diameterMm === diameter) ? price(diameter, input) : null }))
      const minimum = options.find(option => option.fits)?.diameter ?? null
      const requested = input.preferredDiameter || minimum
      const choice = options.find(option => option.diameter === requested && option.fits)
      const selected = choice?.diameter ?? null
      const cost = choice?.cost ?? null
      const actualClearance = choice?.clearance ?? null
      return { metrics: [{ label: "Минимум по параметрам", value: `${fmt(required)} мм` }, { label: input.preferredDiameter ? "Выбранная коронка" : "Ближайшая из справочника", value: selected ? `Ø ${selected} мм` : "Нет подходящей" }, { label: "Бурение одного отверстия", value: cost === null ? "Уточнить цену" : money(cost) }], summary: choice ? `Ø${selected}: зазор ${fmt(choice.clearance)} мм на сторону при заданном минимуме ${fmt(input.clearance)} мм.` : input.preferredDiameter ? `Выбранная коронка Ø${input.preferredDiameter} не вмещает узел с заданным зазором. Выберите другой размер.` : "В справочнике до Ø250 мм нет размера для заданного узла. Нужен индивидуальный подбор.", notes: ["Меньший подходящий диаметр — геометрический подбор, а не готовое монтажное решение. Зазор 1 мм по умолчанию — пример тесного прохода; допустимость зависит от допусков трубы, отверстия, длины прохода и способа заделки.", "Учитывайте самую широкую часть, которая должна пройти через отверстие: раструб, фитинг или изоляцию. Номинал трубы не заменяет замер наружного диаметра.", "При гильзе задайте её стенку и суммарные зазоры внутри и снаружи; для готовой гильзы или уплотнения используйте фактические размеры из инструкции. Не увеличивайте отверстие для систем с фиксированным монтажным размером.", "Справочник коронок отделён от прайс-листа. Для размеров без точного тарифа цена не рассчитывается; наличие инструмента уточняется у мастера.", structureNote, priceNote], data: { assemblyDiameter, required, minimum, selected, actualClearance, cost, options, sources: diameterSources } }
    }
    case "slope": {
      const drop = input.length * input.slope
      const endDepth = input.startDepth + drop
      const angle = Math.atan(input.slope / 100) * 180 / Math.PI
      const pipeLength = Math.hypot(input.length, drop / 100)
      return { metrics: [{ label: "Перепад высот", value: `${fmt(drop)} см` }, { label: "Глубина оси на выходе", value: `${fmt(endDepth)} см` }, { label: "Длина наклонной трубы", value: `${fmt(pipeLength, 2)} м` }], summary: `Уклон ${fmt(input.slope)} см/м — ${fmt(input.slope)}%, угол ${fmt(angle, 2)}° к горизонтали.`, notes: ["Это геометрический расчёт по заданному уклону, без гидравлического подбора и проверки норм. Диаметр трубы показан справочно и не задаёт допустимый уклон.", "Глубины отсчитываются от общей горизонтальной отметки, а не от меняющегося рельефа. Проверьте отметки подключения, грунт и защиту от промерзания.", structureNote], data: { drop, endDepth, angle, pipeLength } }
    }
    case "equipment": {
      const model = equipmentCatalog.find(item => item.id === input.model)
      const required = model?.diameter ?? input.customDiameter
      // Manufacturer hole dimensions must not be silently rounded up to another crown.
      const selected = priceRates.find(row => row.diameterMm === required)?.diameterMm ?? null
      const cost = selected ? price(selected, input) : null
      return { metrics: [{ label: "Отверстие по инструкции", value: `Ø ${required} мм` }, { label: "Толщина стены", value: `${input.depth} мм` }, { label: "Бурение", value: cost === null ? "По согласованию" : money(cost) }], summary: `${model?.name ?? "Ваш прибор"}: ${selected ? "диаметр есть в тарифной сетке." : "уточните наличие коронки; увеличивать диаметр без согласования нельзя."}`, notes: [model?.note ?? "Размер введён пользователем. Проверьте инструкцию производителя.", "Допустимую толщину стены, уклон, отступы и крепления проверьте по монтажной схеме. Прибор, электрика и установка в цену не входят.", structureNote, priceNote], data: { required, selected, cost, model: model ?? null } }
    }
    case "estimate": {
      const rows = input.rows.map(row => ({ ...row, unitPrice: price(row.diameter, row), total: price(row.diameter, row) * row.quantity }))
      const count = rows.reduce((sum, row) => sum + row.quantity, 0)
      const subtotal = rows.reduce((sum, row) => sum + row.total, 0)
      const discount = applyQuantityDiscount(subtotal, count)
      return {
        metrics: [
          { label: "Всего отверстий", value: String(count) },
          { label: "Позиций в смете", value: String(rows.length) },
          { label: "Бурение, ориентир", value: discount.percent > 0 ? `${money(discount.total)} (скидка ${discount.percent}%)` : money(discount.total) },
        ],
        summary: "Смета готова к обсуждению с мастером. Все позиции и доплаты сохраняются при печати.",
        notes: [
          priceNote,
          discount.percent > 0
            ? `Применена скидка за количество ${discount.percent}% на общее число отверстий (${count} шт.): −${money(discount.discountAmount)}. Доплаты за высоту и подпол применяются к каждому отверстию отмеченной позиции. Стоимость выезда не рассчитана.`
            : "Доплаты за высоту и подпол применяются к каждому отверстию отмеченной позиции. Скидка за количество применяется автоматически при увеличении общего числа отверстий в смете. Стоимость выезда не рассчитана.",
          structureNote,
        ],
        data: { rows, subtotal, total: discount.total, discountPercent: discount.percent, discountAmount: discount.discountAmount, count },
      }
    }
    case "moisture": {
      const insideDew = dewPoint(input.insideTemp, input.insideHumidity)
      const outsideDew = dewPoint(input.outsideTemp, input.outsideHumidity)
      const insideRisk = input.surfaceTemp <= insideDew
      const outsideRisk = input.surfaceTemp <= outsideDew
      const outsideWetter = vaporPressure(input.outsideTemp, input.outsideHumidity) > vaporPressure(input.insideTemp, input.insideHumidity)
      return { metrics: [{ label: "Точка росы внутри", value: `${fmt(insideDew)} °C` }, { label: "Точка росы снаружи", value: `${fmt(outsideDew)} °C` }, { label: "Холодная поверхность", value: `${fmt(input.surfaceTemp)} °C` }], summary: insideRisk ? "При заданной температуре поверхности возможен конденсат из внутреннего воздуха." : "По заданным измерениям поверхность теплее точки росы внутреннего воздуха.", notes: [outsideRisk ? "Наружный воздух при охлаждении до этой поверхности также может дать конденсат." : "Для наружного воздуха заданная поверхность находится выше точки росы.", outsideWetter ? "Парциальное давление водяного пара снаружи выше: приток не обязательно осушит подполье." : "Парциальное давление водяного пара снаружи не выше внутреннего. Эффект проветривания зависит также от расхода воздуха и источников влаги.", "Оценка по приближению Магнуса над водой, температуры входных измерений 0–50 °C. Погрешность датчиков, грунтовая влага, протечки, радон и промерзание не моделируются. Это не команда открыть или закрыть продухи."], data: { insideDew, outsideDew, insideRisk, outsideRisk, outsideWetter } }
    }
    case "photo": return { metrics: [{ label: "Отмечено отверстий", value: String(input.markers.length) }, { label: "Размеры", value: "Вручную" }, { label: "Готовый документ", value: "Печать / PDF" }], summary: input.markers.length ? "Метки пронумерованы. Добавьте фактические размеры и примечания, затем подготовьте задание с AI." : "Добавьте фотографию и отметьте первое отверстие.", notes: ["Метки задают положение на фотографии, а не координаты для бурения. Размеры и скрытые конструкции по фотографии не определяются.", structureNote], data: { markers: input.markers, notes: input.notes } }
  }
}
