import { AlertTriangle, ArrowRight, Check, Minus, X } from "lucide-react"

const card = "relative overflow-hidden rounded-2xl border border-border bg-card"
const corner = (
  <>
    <div className="absolute -left-2 -top-2 size-5 border-l-2 border-t-2 border-primary" aria-hidden="true" />
    <div className="absolute -bottom-2 -right-2 size-5 border-b-2 border-r-2 border-primary" aria-hidden="true" />
  </>
)

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">{children}</span>
}

/** The 1/400 rule, shown as a visual chain of steps. */
export function RatioInfographic() {
  const steps = [
    { label: "Площадь подполья", value: "80 м²", note: "дом 8 × 10 м" },
    { label: "Норматив СП", value: "÷ 400", note: "не менее 1/400" },
    { label: "Площадь продухов", value: "0,2 м²", note: "= 2000 см² суммарно" },
  ]
  return (
    <div className={`${card} p-6 sm:p-8`}>
      {corner}
      <Mono>Правило 1/400</Mono>
      <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
        Суммарная площадь всех продухов должна быть не меньше{" "}
        <span className="font-semibold text-foreground">1/400 площади подполья</span>. Для влажных участков и радоноопасных зон площадь увеличивают.
      </p>
      <div className="mt-6 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {steps.map((step, i) => (
          <div key={step.label} className="contents">
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-5 text-center">
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{step.label}</span>
              <span className="text-3xl font-black tabular-nums">{step.value}</span>
              <span className="text-xs text-muted-foreground">{step.note}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center py-1 sm:py-0">
                <ArrowRight className="size-5 rotate-90 text-primary sm:rotate-0" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Worked example: from площадь to количество продухов at two diameters. */
export function CalcExample() {
  const variants = [
    { diameter: "Ø100 мм", areaCm2: 78.5, count: 26 },
    { diameter: "Ø130 мм", areaCm2: 132.7, count: 16 },
  ]
  return (
    <div className={`${card} p-6 sm:p-8`}>
      {corner}
      <Mono>Пример расчёта · дом 8 × 10 м</Mono>
      <div className="mt-5 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        <ol className="flex flex-col gap-4">
          {[
            ["Площадь подполья", "8 × 10 = 80 м²"],
            ["Требуемая площадь продухов", "80 ÷ 400 = 0,2 м² = 2000 см²"],
            ["Площадь одного продуха", "π × r² (зависит от диаметра)"],
            ["Количество", "2000 ÷ площадь одного продуха"],
          ].map(([label, value], i) => (
            <li key={label} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/40 font-mono text-xs font-bold tabular-nums text-primary">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold leading-snug">{label}</p>
                <p className="font-mono text-sm text-muted-foreground">{value}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="grid gap-4 sm:grid-cols-2">
          {variants.map((v) => (
            <div key={v.diameter} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-5">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{v.diameter}</span>
              <span className="text-sm text-muted-foreground">
                площадь одного ≈ <span className="tabular-nums text-foreground">{v.areaCm2.toLocaleString("ru-RU")} см²</span>
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums text-primary">{v.count}</span>
                <span className="text-sm font-medium text-muted-foreground">продуха</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-pretty text-sm font-medium leading-relaxed">
        Чем больше диаметр — тем меньше отверстий. На практике продухи распределяют равномерно по периметру и ставят напротив друг друга, поэтому итоговое число округляют вверх и делят поровну между стенами.
      </p>
    </div>
  )
}

/** Reference table: диаметр → площадь → применение. */
export function DiameterTable() {
  const rows = [
    { d: "Ø100 мм", area: "78,5 см²", use: "Компактное подполье, частые продухи" },
    { d: "Ø110 мм", area: "95,0 см²", use: "Самый ходовой размер под решётку" },
    { d: "Ø125 мм", area: "122,7 см²", use: "Высокий цоколь, влажный участок" },
    { d: "Ø130 мм", area: "132,7 см²", use: "Меньше отверстий на большой периметр" },
    { d: "Ø150 мм", area: "176,7 см²", use: "Большое подполье, усиленная вентиляция" },
  ]
  return (
    <div className={`${card}`}>
      {corner}
      <div className="border-b border-border p-6 sm:p-8">
        <Mono>Диаметры продухов</Mono>
        <p className="mt-2 text-sm text-muted-foreground">Площадь сечения одного отверстия и типичное применение.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-bold sm:px-8">Диаметр</th>
              <th className="px-6 py-3 font-bold">Площадь сечения</th>
              <th className="px-6 py-3 font-bold">Когда выбирают</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.d} className="border-b border-border/60 last:border-0">
                <td className="px-6 py-4 font-bold tabular-nums sm:px-8">{row.d}</td>
                <td className="px-6 py-4 tabular-nums text-muted-foreground">{row.area}</td>
                <td className="px-6 py-4 text-muted-foreground">{row.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Perforator vs diamond drilling — criteria matrix. */
export function MethodComparison() {
  const rows: { criteria: string; perforator: string; diamond: string; win: "d" | "p" | "eq" }[] = [
    { criteria: "Сколы и трещины", perforator: "Частые, крошит край", diamond: "Ровная кромка", win: "d" },
    { criteria: "Пыль", perforator: "Очень много", diamond: "Минимум, вода охлаждает", win: "d" },
    { criteria: "Точность диаметра", perforator: "Приблизительная", diamond: "Точно под коронку", win: "d" },
    { criteria: "Арматура", perforator: "Застревает на металле", diamond: "Режет насквозь", win: "d" },
    { criteria: "Шум и вибрация", perforator: "Высокие", diamond: "Ниже, без ударов", win: "d" },
    { criteria: "Большой диаметр", perforator: "Практически невозможно", diamond: "До 250 мм за проход", win: "d" },
    { criteria: "Мелкие отверстия под дюбель", perforator: "Быстро и дёшево", diamond: "Избыточно", win: "p" },
  ]
  return (
    <div className={`${card}`}>
      {corner}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="p-5 sm:p-6">
          <Mono>Сравнение</Mono>
        </div>
        <div className="border-l border-border p-5 text-center sm:p-6">
          <span className="text-sm font-bold sm:text-base">Перфоратор</span>
        </div>
        <div className="border-l border-border bg-primary/5 p-5 text-center sm:p-6">
          <span className="text-sm font-bold text-primary sm:text-base">Алмазное бурение</span>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map((row) => (
          <div key={row.criteria} className="grid grid-cols-3 items-stretch">
            <div className="flex items-center px-5 py-4 text-sm font-semibold sm:px-6">{row.criteria}</div>
            <div className="flex items-center gap-2 border-l border-border px-5 py-4 text-sm text-muted-foreground sm:px-6">
              {row.win === "p" ? <Check className="size-4 shrink-0 text-primary" /> : <X className="size-4 shrink-0 text-muted-foreground/50" />}
              <span>{row.perforator}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-border bg-primary/5 px-5 py-4 text-sm sm:px-6">
              {row.win === "d" ? <Check className="size-4 shrink-0 text-primary" /> : <Minus className="size-4 shrink-0 text-muted-foreground/50" />}
              <span className="text-foreground">{row.diamond}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** AC line-set hole diameters by system power. */
export function ACDiameterTable() {
  const rows = [
    { system: "Сплит до 2,5 кВт (7)", power: "маленькая комната", hole: "Ø45 мм" },
    { system: "Сплит 3,5 кВт (9–12)", power: "спальня, гостиная", hole: "Ø50 мм" },
    { system: "Сплит 5–7 кВт (18–24)", power: "большая комната", hole: "Ø55 мм" },
    { system: "Мульти-сплит / несколько трасс", power: "две трассы и более", hole: "Ø70–80 мм" },
  ]
  return (
    <div className={`${card}`}>
      {corner}
      <div className="border-b border-border p-6 sm:p-8">
        <Mono>Диаметр под трассу кондиционера</Mono>
        <p className="mt-2 text-sm text-muted-foreground">
          Ориентир для стандартной трассы (2 медные трубки в изоляции, дренаж и кабель). Точный размер уточняйте у монтажника сплит-системы.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-bold sm:px-8">Система</th>
              <th className="px-6 py-3 font-bold">Помещение</th>
              <th className="px-6 py-3 font-bold">Отверстие</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.system} className="border-b border-border/60 last:border-0">
                <td className="px-6 py-4 font-semibold sm:px-8">{row.system}</td>
                <td className="px-6 py-4 text-muted-foreground">{row.power}</td>
                <td className="px-6 py-4 font-bold tabular-nums text-primary">{row.hole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground sm:px-8">
        Отверстие делают с небольшим уклоном на улицу (2–5°), чтобы конденсат из дренажа уходил наружу, а не в стену.
      </p>
    </div>
  )
}

/** When vents are mandatory vs when you can skip them. */
export function WhenNeeded() {
  const need = [
    "Ленточный фундамент с холодным подпольем",
    "Свайно-ростверковый фундамент с зазором до земли",
    "Деревянные лаги и перекрытие первого этажа",
    "Влажный грунт, высокий уровень грунтовых вод",
  ]
  const skip = [
    "Утеплённая шведская плита (УШП) — подполья нет",
    "Тёплый эксплуатируемый подвал со своей вентиляцией",
    "Монолитная плита по грунту без воздушной прослойки",
    "Подполье с приточно-вытяжной механической вентиляцией",
  ]
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={`${card} p-6 sm:p-8`}>
        {corner}
        <div className="flex items-center gap-2">
          <Check className="size-5 text-primary" />
          <span className="text-lg font-black">Продухи обязательны</span>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          {need.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <X className="size-5 text-muted-foreground" />
          <span className="text-lg font-black">Можно без продухов</span>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          {skip.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Winter: do / don't guidance for closing vents. */
export function WinterGuide() {
  const doItems = ["Прикрывать заслонку или сетку частично", "Оставлять небольшой воздухообмен", "Регулировать по влажности и инею внутри", "Ставить регулируемые вентрешётки"]
  const dontItems = ["Замуровывать наглухо раствором или пеной", "Закрывать все продухи разом", "Затыкать тряпками без контроля", "Забывать открыть весной"]
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={`${card} p-6 sm:p-8`}>
        {corner}
        <div className="flex items-center gap-2">
          <Check className="size-5 text-primary" />
          <span className="text-lg font-black">Как правильно</span>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          {doItems.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <span className="text-lg font-black">Частые ошибки</span>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          {dontItems.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <X className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export const infographics = {
  ratio: RatioInfographic,
  calc: CalcExample,
  diameters: DiameterTable,
  methods: MethodComparison,
  "ac-diameters": ACDiameterTable,
  "when-needed": WhenNeeded,
  winter: WinterGuide,
} as const

export type InfographicKind = keyof typeof infographics
