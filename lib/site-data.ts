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

export const materials = ["Бетон", "Железобетон", "Кирпич", "Фундаментные блоки", "Монолит", "Перекрытия"]

// Base rates in ₽ per cm of depth, by diameter and material.
// Source of truth for both the price table and the calculator below.
export const priceRates = [
  { diameterMm: 52, diameterLabel: "до 52 мм", concrete: 30, reinforced: 40, brick: 25 },
  { diameterMm: 82, diameterLabel: "82 мм", concrete: 35, reinforced: 45, brick: 30 },
  { diameterMm: 102, diameterLabel: "102 мм", concrete: 40, reinforced: 50, brick: 35 },
  { diameterMm: 112, diameterLabel: "112 мм", concrete: 42, reinforced: 55, brick: 37 },
  { diameterMm: 132, diameterLabel: "132 мм", concrete: 45, reinforced: 60, brick: 40 },
  { diameterMm: 152, diameterLabel: "152 мм", concrete: 50, reinforced: 70, brick: 45 },
  { diameterMm: 162, diameterLabel: "162 мм", concrete: 55, reinforced: 75, brick: 48 },
  { diameterMm: 200, diameterLabel: "200 мм", concrete: 70, reinforced: 95, brick: 60 },
  { diameterMm: 250, diameterLabel: "250 мм", concrete: 90, reinforced: 120, brick: 75 },
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

export const pricingConfig = {
  minHolePrice: 3000,
  heightSurcharge: 1500,
  underFloorSurcharge: 1500,
  // Standard коронка covers depth up to this threshold. Beyond it we need to
  // add an удлинитель (extension rod), which costs extra time and a coupling,
  // so the rate per cm for the extra depth is higher.
  extendedDepthThresholdMm: 300,
  extendedDepthRateMultiplier: 1.25,
  // Concrete and reinforced concrete are denser and wear coronkas faster than
  // brick, so they carry an extra flat markup on top of the base rate.
  hardMaterialSurchargeMultiplier: 1.2,
}

// Volume discount on the total order: more holes in one visit means less
// setup/travel overhead per hole, so we pass part of that saving on.
export const quantityDiscountTiers = [
  { minQuantity: 20, percent: 15 },
  { minQuantity: 10, percent: 10 },
  { minQuantity: 5, percent: 5 },
] as const

export function getQuantityDiscountPercent(quantity: number) {
  return quantityDiscountTiers.find((tier) => quantity >= tier.minQuantity)?.percent ?? 0
}

export function applyQuantityDiscount(subtotal: number, quantity: number) {
  const percent = getQuantityDiscountPercent(quantity)
  const discountAmount = Math.round((subtotal * percent) / 100)
  return { percent, discountAmount, total: subtotal - discountAmount }
}

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
  const rateRow = priceRates.find((row) => row.diameterMm === diameterMm) ?? priceRates[0]
  const ratePerCm = rateRow[material]
  const depthCm = depthMm / 10
  const thresholdCm = pricingConfig.extendedDepthThresholdMm / 10
  const normalCm = Math.min(depthCm, thresholdCm)
  const extendedCm = Math.max(0, depthCm - thresholdCm)
  const normalCost = normalCm * ratePerCm
  const extendedCost = extendedCm * ratePerCm * pricingConfig.extendedDepthRateMultiplier
  // Minimum price covers the standard-depth portion only — extra depth beyond
  // the threshold always adds on top, so it can't get absorbed by the floor.
  const isHardMaterial = material === "concrete" || material === "reinforced"
  const base = (Math.max(normalCost, pricingConfig.minHolePrice) + extendedCost) * (isHardMaterial ? pricingConfig.hardMaterialSurchargeMultiplier : 1)
  const surcharge = (atHeight ? pricingConfig.heightSurcharge : 0) + (underFloor ? pricingConfig.underFloorSurcharge : 0)
  return Math.round(base + surcharge)
}

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
  ["Сколько стоит алмазное бурение?", `Рыночная стоимость начинается от 25 ₽ за сантиметр в кирпиче, от 30 ₽ в бетоне и от 40 ₽ в железобетоне. Минимальная стоимость одного отверстия — ${pricingConfig.minHolePrice.toLocaleString("ru-RU")} ₽ независимо от глубины. На глубине свыше ${(pricingConfig.extendedDepthThresholdMm / 10).toFixed(0)} см стандартной коронки не хватает и нужен удлинитель — цена за см на превышении выше в ${pricingConfig.extendedDepthRateMultiplier} раза. Отверстия на высоте и в подполе — доплата от ${pricingConfig.heightSurcharge.toLocaleString("ru-RU")} ₽. Точная цена зависит от диаметра, глубины и условий на объекте.`],
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
