import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  Clock,
  Gauge,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { locations, materials, prices, pricingConfig, services, site, works } from "@/lib/site-data"
import { locationSlug } from "@/lib/content"
import { BoreReticle, Counter, Marquee, Reveal } from "@/components/animations"
import { BeforeAfterSlider } from "@/components/before-after"
import { PriceCalculator } from "@/components/price-calculator"
import { ventPage } from "@/lib/vent-page"

const sectionClass = "mx-auto max-w-7xl px-4 lg:px-6"

export function SectionHeading({ eyebrow, title, text, light }: { eyebrow?: string; title: string; text?: string; light?: boolean }) {
  return (
    <Reveal className="mb-10 flex max-w-3xl flex-col gap-3 sm:mb-12">
      {eyebrow && (
        <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
          <span className="inline-block h-px w-8 bg-primary" />
          {eyebrow}
        </span>
      )}
      <h2 className={`text-balance text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05] ${light ? "text-background" : ""}`}>{title}</h2>
      {text && <p className={`text-pretty text-base leading-relaxed sm:text-lg ${light ? "text-background/70" : "text-muted-foreground"}`}>{text}</p>}
    </Reveal>
  )
}

export function Hero() {
  const points = ["Диаметры под задачу", "Проходим железобетон", "Без ударной нагрузки", "Выезд по округу"]
  const stats = [
    { to: 250, suffix: " мм", label: "макс. диаметр" },
    { to: 12, suffix: "+", label: "населённых пунктов" },
    { to: 25, prefix: "от ", suffix: " ₽/см", label: "стоимость" },
  ]
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 hud-grid" aria-hidden="true" />
      <div className={`${sectionClass} relative grid min-h-[640px] items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20`}>
        <div className="flex flex-col gap-7">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Частный мастер · Солнечногорск и округ
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-balance text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              Алмазное бурение <span className="text-primary">без пыли</span> и разрушений
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Точные отверстия в бетоне, железобетоне и кирпиче под вентиляцию, канализацию, отопление и кондиционеры. Ровная кромка, дозированная вода, аккуратная рабочая зона.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm font-medium">
                  <Check className="size-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={320}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6" render={<Link href="#prices" />}>
                Рассчитать стоимость
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6" render={<a href={`tel:${site.phone}`} />}>
                <Phone data-icon="inline-start" />
                {site.phoneDisplay}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <dl className="grid grid-cols-3 gap-4 border-t border-border pt-6">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <dd className="font-mono text-2xl font-black text-foreground sm:text-3xl">
                    <Counter to={stat.to} prefix={stat.prefix} suffix={stat.suffix} />
                  </dd>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
            <Image
              src="/images/hero-drilling.png"
              alt="Мастер SUNBUR выполняет алмазное бурение стены профессиональной установкой"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/20" />
            {/* Bore reticle overlay */}
            <BoreReticle className="absolute right-5 top-5 size-24 text-background sm:size-28" />
            {/* Scanning line */}
            <div className="absolute inset-x-0 top-1/2 h-px animate-scan bg-primary/70" />
            {/* Corner ticks + telemetry */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border bg-background/85 px-3 py-2 backdrop-blur">
              <CircleDot className="size-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Ø 132 mm · ЖБ 300 mm</span>
            </div>
          </div>
          <div className="absolute -left-3 -top-3 size-6 border-l-2 border-t-2 border-primary" aria-hidden="true" />
          <div className="absolute -bottom-3 -right-3 size-6 border-b-2 border-r-2 border-primary" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  )
}

export function MaterialsMarquee() {
  return (
    <section className="border-b border-border bg-card py-8" aria-label="Материалы">
      <Marquee items={materials} />
    </section>
  )
}

export function ServiceCards() {
  return (
    <section id="services" className="py-20 sm:py-24">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Задачи" title="Отверстия для любых коммуникаций" text="Подберём диаметр коронки под трубу, воздуховод или кабельный ввод — от 32 до 250 мм." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <Reveal key={service.title} delay={(index % 4) * 70}>
                <Link
                  href={service.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60"
                >
                  <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/50">{String(index + 1).padStart(2, "0")}</span>
                  <span className="mb-8 flex size-12 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mb-2 text-lg font-bold">{service.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                  <span className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary">
                    Подробнее
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Benefits() {
  const items = [
    { icon: CircleDot, title: "Ровное отверстие", text: "Аккуратные кромки без сколов и лишнего разрушения." },
    { icon: Waves, title: "Без сильной вибрации", text: "Нет постоянной ударной нагрузки на конструкцию." },
    { icon: ShieldCheck, title: "Арматура не проблема", text: "Коронка проходит бетон вместе с арматурой." },
    { icon: Gauge, title: "Точный диаметр", text: "Коронка под конкретную трубу или коммуникацию." },
    { icon: Ruler, title: "Большая глубина", text: "Работаем с толстыми стенами и фундаментами." },
    { icon: Sparkles, title: "Аккуратная работа", text: "Используем водосбор и готовим рабочую зону." },
  ]
  return (
    <section className="border-y border-border bg-card py-20 sm:py-24">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Технология" title="Почему выбирают алмазное бурение" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={(index % 3) * 80}>
              <div className="flex gap-4 border-t border-border pt-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="mb-2 font-bold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PricingTable() {
  return (
    <section id="prices" className="py-20 sm:py-24">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Прозрачные условия" title="Цены на алмазное бурение" text="Ориентировочная стоимость за сантиметр проходки. Итог зависит от диаметра, материала, толщины и условий доступа." />
        <Reveal className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-4 gap-px bg-border font-mono text-xs font-bold uppercase tracking-wider">
            {["Диаметр", "Бетон", "Железобетон", "Кирпич"].map((h) => (
              <div key={h} className="bg-secondary px-4 py-3.5 text-secondary-foreground">{h}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-px bg-border">
            {prices.map((row) => (
              <div key={row.diameter} className="contents">
                <div className="bg-card px-4 py-3.5 font-mono font-bold text-primary">{row.diameter}</div>
                <div className="bg-card px-4 py-3.5 text-sm">{row.concrete}</div>
                <div className="bg-card px-4 py-3.5 text-sm">{row.reinforced}</div>
                <div className="bg-card px-4 py-3.5 text-sm">{row.brick}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="mt-6">
          <PriceCalculator />
        </Reveal>
        <Link href={ventPage.path} className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"><span><strong className="block text-sm">Нужны продухи в фундаменте?</strong><span className="mt-1 block text-sm text-muted-foreground">Рассчитайте количество, диаметр и стоимость в 3D-калькуляторе.</span></span><ArrowUpRight className="size-5 shrink-0 text-primary" /></Link>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Стоимость зависит от диаметра, материала, толщины конструкции, количества отверстий, наличия арматуры и условий работы. Минимальная стоимость одного отверстия — {pricingConfig.minHolePrice.toLocaleString("ru-RU")} ₽ независимо от глубины.
        </p>
      </div>
    </section>
  )
}

export function WorksGrid() {
  return (
    <section id="works" className="border-y border-border bg-card py-20 sm:py-24">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Практика" title="Примеры выполненных работ" text="Показываем материал, диаметр и условия — без общих обещаний." />
        <div className="grid gap-6 lg:grid-cols-3">
          {works.map((work, index) => (
            <Reveal key={work.title} delay={index * 90}>
              <WorkCard work={work} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function WorkCard({ work }: { work: (typeof works)[number] }) {
  return (
    <Link
      href={work.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-primary/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image src={work.image} alt={work.title} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4 flex items-center gap-1 rounded-md bg-background/85 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider backdrop-blur">
          <MapPin className="size-3.5 text-primary" />
          {work.location}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold">{work.title}</h3>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Материал</dt>
            <dd className="mt-1 font-semibold">{work.material}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Толщина</dt>
            <dd className="mt-1 font-mono font-semibold">{work.thickness}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Диаметр</dt>
            <dd className="mt-1 font-mono font-semibold text-primary">{work.diameter}</dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}

export function BeforeAfter() {
  return (
    <section className="py-20 sm:py-24">
      <div className={sectionClass}>
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="Результат" title="До и после бурения" text="Потяните ползунок, чтобы сравнить стену до работы и готовое отверстие с ровной кромкой." />
          <Reveal delay={120}>
            <BeforeAfterSlider />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function ProcessSteps() {
  const steps = [
    ["Отправляете информацию", "Фото стены, диаметр, толщину и адрес объекта."],
    ["Рассчитываем стоимость", "Называем предварительную цену и согласовываем время."],
    ["Приезжаем на объект", "Привозим установку и коронки нужного диаметра."],
    ["Выполняем бурение", "Получаете аккуратное отверстие под вашу задачу."],
  ]
  return (
    <section className="border-y border-border bg-card py-20 sm:py-24">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Процесс" title="Как проходит работа" />
        <ol className="grid gap-6 md:grid-cols-4">
          {steps.map(([title, text], index) => (
            <Reveal key={title} delay={index * 90} as="li">
              <div className="relative flex h-full flex-col rounded-xl border border-border bg-background p-6">
                <span className="mb-6 font-mono text-3xl font-black text-primary">{String(index + 1).padStart(2, "0")}</span>
                {index < steps.length - 1 && <span className="absolute right-6 top-9 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-primary/50 to-transparent md:block" aria-hidden="true" />}
                <h3 className="mb-2 font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function LocationsGrid() {
  return (
    <section id="locations" className="py-20 sm:py-24">
      <div className={sectionClass}>
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="Районы выезда" title="Выезжаем по Солнечногорску и району" text="Работаем в СНТ, коттеджных посёлках и деревнях Солнечногорского городского округа." />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {locations.map((location, index) => (
              <Reveal key={location} delay={(index % 3) * 60}>
                <Link
                  href={`/${locationSlug(location)}/`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card p-3.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                >
                  <MapPin className="size-4 text-primary" />
                  {location}
                  {index === 0 && <span className="sr-only"> — основной город</span>}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function MasterBlock() {
  const points = ["Напрямую обсуждаем задачу", "Без посредников", "Понятная стоимость", "Можно прислать фото объекта", "Согласовываем удобное время"]
  return (
    <section id="master" className="border-y border-border bg-card py-20 sm:py-24">
      <div className={`${sectionClass} grid items-center gap-10 lg:grid-cols-2`}>
        <Reveal className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
            <Image src="/images/hero-drilling.png" alt="Частный мастер SUNBUR с установкой алмазного бурения" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-4 -right-4 hidden rounded-xl border border-border bg-background p-4 shadow-xl sm:block">
            <BoreReticle className="size-16 text-foreground" />
          </div>
        </Reveal>
        <div>
          <SectionHeading eyebrow="Личный контакт" title="Работаете напрямую с мастером" text="Без менеджеров и передачи заказа сторонним исполнителям. Сразу обсудим задачу, посмотрим фото и назовём предварительную стоимость." />
          <ul className="flex flex-col gap-3">
            {points.map((point, index) => (
              <Reveal key={point} delay={index * 60} as="li">
                <span className="flex items-center gap-3">
                  <Check className="size-5 text-primary" />
                  <span className="font-medium">{point}</span>
                </span>
              </Reveal>
            ))}
          </ul>
          <Button size="lg" className="mt-7" render={<a href={site.whatsapp} target="_blank" rel="noreferrer" />}>
            <MessageCircle data-icon="inline-start" />
            Отправить фото
          </Button>
        </div>
      </div>
    </section>
  )
}

export function ContactCTA() {
  return (
    <section id="contacts" className="relative overflow-hidden bg-primary py-20 text-primary-foreground sm:py-24">
      <BoreReticle className="pointer-events-none absolute -right-16 -top-16 size-72 text-primary-foreground/20 sm:size-96" />
      <div className={`${sectionClass} relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end`}>
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.22em]">Связаться с мастером</span>
          <h2 className="text-balance text-3xl font-black tracking-tight sm:text-5xl">Нужно сделать отверстие?</h2>
          <p className="text-pretty text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
            Позвоните или пришлите фото места бурения в WhatsApp или Telegram — рассчитаем стоимость.
          </p>
          <a href={`tel:${site.phone}`} className="font-mono text-2xl font-black sm:text-4xl">{site.phoneDisplay}</a>
          <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
            <Mail className="size-4" />
            {site.email}
          </a>
          <span className="flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            {site.hours}
          </span>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex lg:w-auto">
          <Button size="lg" variant="secondary" render={<a href={`tel:${site.phone}`} />}>
            <Phone data-icon="inline-start" />
            Позвонить
          </Button>
          <Button size="lg" variant="secondary" render={<a href={site.whatsapp} target="_blank" rel="noreferrer" />}>WhatsApp</Button>
          <Button size="lg" variant="secondary" render={<a href={site.telegram} target="_blank" rel="noreferrer" />}>Telegram</Button>
        </div>
      </div>
    </section>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Хлебн��е крошки" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/">Главная</Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
