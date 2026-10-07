import {
  AirVent,
  Cable,
  Droplets,
  Flame,
  HousePlug,
  Pipette,
  Snowflake,
  Waves,
  Wind,
} from "lucide-react"

export const site = {
  phoneDisplay: "+7 (977) 872-28-14",
  phone: "+79778722814",
  whatsapp: "https://wa.me/79778722814",
  telegram: "https://t.me/sunbur_ru",
  email: "info@sunbur.ru",
  hours: "Ежедневно: 08:00–21:00",
}

// TODO: указать ОГРНИП — по мере готовности впишите сюда.
export const operator = {
  name: "Карпычев Максим Александрович",
  status: "Индивидуальный предприниматель",
  inn: "504408371838",
  ogrn: "",
  region: "Солнечногорск, Московская область",
}

export const navigation = [
  { label: "Услуги", href: "/#services" },
  { label: "Цены", href: "/#prices" },
  { label: "Инструменты", href: "/instrumenty" },
  { label: "Блог", href: "/blog" },
  { label: "Наши работы", href: "/#works" },
  { label: "Районы выезда", href: "/#locations" },
  { label: "О нас", href: "/#master" },
  { label: "FAQ", href: "/#faq" },
  { label: "Контакты", href: "/#contacts" },
]

export const services = [
  { title: "Вентиляция", description: "Отверстия под приточную и вытяжную вентиляцию.", href: "/uslugi/otverstiya-pod-ventilyaciyu", icon: AirVent },
  { title: "Канализация", description: "Проходы под трубы через стены, перекрытия и фундамент.", href: "/uslugi/otverstiya-pod-kanalizaciyu", icon: Pipette },
  { title: "Отопление", description: "Отверстия под трубы отопления и инженерные коммуникации.", href: "/uslugi/almaznoe-burenie", icon: Flame },
  { title: "Кондиционеры", description: "Аккуратные отверстия под трассы кондиционеров.", href: "/uslugi/almaznoe-burenie", icon: Snowflake },
  { title: "Котлы", description: "Отверстия под дымоходы и коммуникации котельного оборудования.", href: "/uslugi/almaznoe-burenie", icon: HousePlug },
  { title: "Продухи в фундаменте", description: "Вентиляция подполья: защита от сырости, грибка и гниения полов.", href: "/uslugi/produhi-v-fundamente", icon: Wind },
  { title: "Фундамент", description: "Ввод коммуникаций и технологические отверстия в фундаменте.", href: "/uslugi/burenie-fundamenta", icon: Waves },
  { title: "Водоснабжение", description: "Отверстия под водопроводные трубы.", href: "/uslugi/almaznoe-burenie", icon: Droplets },
  { title: "Электрика", description: "Технологические отверстия под кабельные трассы и вводы.", href: "/uslugi/almaznoe-burenie", icon: Cable },
]

// Rates in ₽ per cm of depth, by diameter and material — exactly what the calculator charges,
// with no hidden multipliers. Calibrated in October 2026 against Moscow-region price lists
// (see docs/pricing.md): concrete and reinforced concrete about 10% below the market median,
// brick about 20% below it, because brick drills several times faster and wears crowns less.
export const priceRates = [
  { diameterMm: 52, diameterLabel: "до 52 мм", concrete: 25, reinforced: 31, brick: 16 },
  { diameterMm: 82, diameterLabel: "82 мм", concrete: 29, reinforced: 36, brick: 19 },
  { diameterMm: 102, diameterLabel: "102 мм", concrete: 33, reinforced: 42, brick: 22 },
  { diameterMm: 112, diameterLabel: "112 мм", concrete: 36, reinforced: 45, brick: 22 },
  { diameterMm: 132, diameterLabel: "132 мм", concrete: 38, reinforced: 49, brick: 24 },
  { diameterMm: 152, diameterLabel: "152 мм", concrete: 41, reinforced: 52, brick: 26 },
  { diameterMm: 162, diameterLabel: "162 мм", concrete: 43, reinforced: 54, brick: 27 },
  { diameterMm: 200, diameterLabel: "200 мм", concrete: 54, reinforced: 72, brick: 36 },
  { diameterMm: 250, diameterLabel: "250 мм", concrete: 77, reinforced: 99, brick: 48 },
] as const

export type MaterialKey = "concrete" | "reinforced" | "brick"

export const materialOptions: { value: MaterialKey; label: string }[] = [
  { value: "brick", label: "Кирпич" },
  { value: "concrete", label: "Бетон" },
  { value: "reinforced", label: "Железобетон" },
]

export const prices = priceRates.map(({ diameterLabel, concrete, reinforced, brick }) => ({
  diameter: diameterLabel,
  concrete: `от ${concrete} ₽/см`,
  reinforced: `от ${reinforced} ₽/см`,
  brick: `от ${brick} ₽/см`,
}))

/** Lowest rate per cm for each material, for "from" prices in copy. */
export const lowestRates = {
  brick: Math.min(...priceRates.map((row) => row.brick)),
  concrete: Math.min(...priceRates.map((row) => row.concrete)),
  reinforced: Math.min(...priceRates.map((row) => row.reinforced)),
}

export const pricingConfig = {
  // Travel within Solnechnogorsk district, unloading, water, floor protection and cleanup:
  // roughly 1.5–2 hours that do not depend on how many holes are drilled, so they are
  // charged once per order instead of being hidden in every hole.
  callOutFee: 3000,
  // The smallest order total, call-out included. Competitors' minimums in the region
  // are 6 000–9 000 ₽ plus mileage beyond the MKAD.
  minOrderPrice: 5500,
  // Covers setting up the rig at one hole and crown wear, so a shallow hole is not
  // priced below the time it takes. Applies to the drilling part of a single hole.
  minHolePrice: 800,
  // Market-standard multipliers for work at height and in a crawlspace or pit.
  heightMultiplier: 1.2,
  underFloorMultiplier: 1.2,
  // Standard коронка covers depth up to this threshold. Beyond it we need to
  // add an удлинитель (extension rod), which costs extra time and a coupling,
  // so the rate per cm for the extra depth is higher.
  extendedDepthThresholdMm: 300,
  extendedDepthRateMultiplier: 1.25,
}

const formatRub = (value: number) => `${value.toLocaleString("ru-RU")} ₽`

/** One sentence with the per-order terms, shared by the price page, FAQ, calculators and chat. */
export const orderTermsText = `Выезд и подготовка по Солнечногорскому округу — ${formatRub(pricingConfig.callOutFee)} за заказ, минимальный заказ — ${formatRub(pricingConfig.minOrderPrice)} вместе с выездом.`

// Volume discount on the drilling part of the order. The call-out fee already covers
// travel, so the discount stays modest and only rewards real series.
export const quantityDiscountTiers = [
  { minQuantity: 20, percent: 10 },
  { minQuantity: 10, percent: 5 },
] as const

/** Discount tiers in ascending order as text: "5% от 10 отверстий, 10% от 20". */
export const discountTermsText = [...quantityDiscountTiers].reverse().map((tier, index) => `${tier.percent}% от ${tier.minQuantity}${index === 0 ? " отверстий" : ""}`).join(", ")

export function getQuantityDiscountPercent(quantity: number) {
  return quantityDiscountTiers.find((tier) => quantity >= tier.minQuantity)?.percent ?? 0
}

export function applyQuantityDiscount(subtotal: number, quantity: number) {
  const percent = getQuantityDiscountPercent(quantity)
  const discountAmount = Math.round((subtotal * percent) / 100)
  return { percent, discountAmount, total: subtotal - discountAmount }
}

/**
 * Turns the drilling subtotal of one visit into the amount the client pays: the quantity
 * discount on drilling, the call-out fee once, and a top-up to the minimum order if needed.
 */
export function quoteOrder(drillingSubtotal: number, quantity: number) {
  const discount = applyQuantityDiscount(drillingSubtotal, quantity)
  const beforeMinimum = discount.total + pricingConfig.callOutFee
  const minimumTopUp = Math.max(0, pricingConfig.minOrderPrice - beforeMinimum)
  return {
    subtotal: drillingSubtotal,
    percent: discount.percent,
    discountAmount: discount.discountAmount,
    drilling: discount.total,
    callOutFee: pricingConfig.callOutFee,
    minimumTopUp,
    total: beforeMinimum + minimumTopUp,
  }
}

export type OrderQuote = ReturnType<typeof quoteOrder>

/**
 * Returns the material's rate in rubles per centimeter for a diameter in millimeters.
 * Interpolates linearly between tariff diameters, preserving exact tariff rates.
 * Diameters outside the tariff range use the nearest endpoint's rate.
 */
export function getRatePerCm(diameterMm: number, material: MaterialKey) {
  const first = priceRates[0]
  const last = priceRates[priceRates.length - 1]
  if (diameterMm <= first.diameterMm) return first[material]
  if (diameterMm >= last.diameterMm) return last[material]
  const upperIndex = priceRates.findIndex((row) => row.diameterMm >= diameterMm)
  const upper = priceRates[upperIndex]
  const lower = priceRates[upperIndex - 1]
  const t = (diameterMm - lower.diameterMm) / (upper.diameterMm - lower.diameterMm)
  return lower[material] + (upper[material] - lower[material]) * t
}

/**
 * Returns the rounded drilling price in rubles for one hole, with diameter and depth in millimeters.
 * Applies the per-hole minimum, the extra-depth charge and work-condition multipliers.
 * The call-out fee, quantity discount and minimum order are added per order by `quoteOrder`.
 */
export function calculateHolePrice({
  diameterMm,
  material,
  depthMm,
  atHeight,
  underFloor,
}: {
  diameterMm: number
  material: MaterialKey
  depthMm: number
  atHeight: boolean
  underFloor: boolean
}) {
  const ratePerCm = getRatePerCm(diameterMm, material)
  const depthCm = depthMm / 10
  const thresholdCm = pricingConfig.extendedDepthThresholdMm / 10
  const normalCm = Math.min(depthCm, thresholdCm)
  const extendedCm = Math.max(0, depthCm - thresholdCm)
  const normalCost = normalCm * ratePerCm
  const extendedCost = extendedCm * ratePerCm * pricingConfig.extendedDepthRateMultiplier
  // Minimum price covers the standard-depth portion only — extra depth beyond
  // the threshold always adds on top, so it can't get absorbed by the floor.
  const base = Math.max(normalCost, pricingConfig.minHolePrice) + extendedCost
  const conditions = (atHeight ? pricingConfig.heightMultiplier : 1) * (underFloor ? pricingConfig.underFloorMultiplier : 1)
  return Math.round(base * conditions)
}

/** Formats a multiplier such as 1.2 as a surcharge label: "+20%". */
export const surchargeLabel = (multiplier: number) => `+${Math.round((multiplier - 1) * 100)}%`

export const locations = ["Солнечногорск", "Андреевка", "Поварово", "Менделеево", "Лунёво", "Голубое", "Пешки", "Радумля", "Ржавки", "Брёхово", "Смирновка", "Алабушево"]

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
  name: "SUNBUR",
  legalName: `ИП ${operator.name}`,
  taxID: operator.inn,
  url: "https://sunbur.ru",
  telephone: site.phone,
  email: site.email,
  image: "https://sunbur.ru/images/hero-drilling.png",
  description: "Алмазное бурение и сверление отверстий в Солнечногорске и Солнечногорском городском округе.",
  address: { "@type": "PostalAddress", addressLocality: "Солнечногорск", addressRegion: "Московская область", addressCountry: "RU" },
  areaServed: locations.map((name) => ({ "@type": "AdministrativeArea", name })),
  openingHours: "Mo-Su 08:00-21:00",
  priceRange: "₽₽",
  sameAs: [site.whatsapp, site.telegram],
  makesOffer: { "@type": "Offer", itemOffered: { "@type": "Service", name: "Алмазное бурение", serviceType: "Алмазное сверление бетона, железобетона и кирпича" } },
}

export const works = [
  { title: "Отверстие Ø132 мм под вентиляцию", location: "Солнечногорск", material: "Железобетон", thickness: "300 мм", diameter: "132 мм", image: "/images/work-ventilation.png", href: "/works/almaznoe-burenie-132mm-ventilyaciya-solnechnogorsk" },
  { title: "Бурение фундамента под канализацию", location: "Частный дом", material: "Фундамент", thickness: "400 мм", diameter: "162 мм", image: "/images/work-foundation.png", href: "/works/burenie-fundamenta-pod-kanalizaciyu" },
  { title: "Отверстие под вытяжку", location: "Солнечногорский округ", material: "Кирпичная стена", thickness: "250 мм", diameter: "132 мм", image: "/images/work-finished-hole.png", href: "/works/otverstie-pod-vytyazhku" },
]

export const faqs = [
  ["Сколько стоит алмазное бурение?", `Бурение — от ${lowestRates.brick} ₽ за сантиметр в кирпиче, от ${lowestRates.concrete} ₽ в бетоне и от ${lowestRates.reinforced} ₽ в железобетоне. ${orderTermsText} На глубине свыше ${(pricingConfig.extendedDepthThresholdMm / 10).toFixed(0)} см стандартной коронки не хватает и нужен удлинитель — цена за см на превышении выше в ${pricingConfig.extendedDepthRateMultiplier} раза. Работа на высоте — ${surchargeLabel(pricingConfig.heightMultiplier)}, в подполе — ${surchargeLabel(pricingConfig.underFloorMultiplier)} к стоимости бурения. Скидка за количество: ${discountTermsText}. Точная цена зависит от диаметра, глубины и условий на объекте.`],
  ["От чего зависит цена отверстия?", "От диаметра, материала, толщины конструкции, количества отверстий, работы на высоте или в подполе, условий доступа и расстояния до объекта."],
  ["Можно ли бурить железобетон с арматурой?", "Да. Алмазная коронка проходит бетон вместе с арматурой без постоянной ударной нагрузки."],
  ["Можно ли сделать отверстие в фундаменте?", "Да, бурим технологические отверстия и проходы под канализацию, воду и продухи в фундаментах."],
  ["Какой диаметр отверстия нужен под вентиляцию?", "Зависит от диаметра воздуховода и монтажа. Часто используют 132–162 мм, но размер лучше уточнить у монтажника."],
  ["Можно ли бурить под канализацию?", "Да. Подбираем коронку под трубу с учётом необходимого зазора и уклона."],
  ["Много ли воды используется при бурении?", "Вода подаётся дозированно для охлаждения коронки и снижения пыли. При необходимости используем водосбор."],
  ["Остается ли много грязи?", "Рабочую зону подготавливаем заранее. Вода и шлам собираются, поэтому загрязнение получается локальным."],
  ["Можно ли работать в жилой квартире?", "Да, если есть доступ к месту бурения, электричеству и возможность безопасно закрепить установку."],
  ["Можно ли бурить под углом?", "Да, установка позволяет выполнять отверстия под согласованным углом."],
  ["Какую максимальную толщину стены можно пройти?", "Глубина зависит от задачи и доступного пространства. Толстые стены и фундаменты можно проходить с удлинителями."],
  ["Выезжаете ли вы за пределы Солнечногорска?", "Да, работаем по Солнечногорскому округу, СНТ, деревням и коттеджным посёлкам."],
  ["Что нужно прислать для расчета стоимости?", "Фото места бурения, материал и толщину стены, нужный диаметр, количество отверстий и адрес объекта."],
]
