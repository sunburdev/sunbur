import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check, CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { site } from "@/lib/site-data"
import type { PageContent } from "@/lib/content"
import { Reveal } from "@/components/animations"
import { Benefits, Breadcrumbs, LocationsGrid, PricingTable, ProcessSteps, SectionHeading, ServiceCards, WorksGrid } from "@/components/site-sections"
import { FAQ } from "@/components/site-interactive"
import { VentCalculatorPromo } from "@/components/vent-calculator-promo"
import { ventPage } from "@/lib/vent-page"

const sectionClass = "mx-auto max-w-7xl px-4 lg:px-6"

export function InternalHero({ content, crumbs, showVentCalculator = false }: { content: PageContent; crumbs: { label: string; href?: string }[]; showVentCalculator?: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 hud-grid" aria-hidden="true" />
      <div className={`${sectionClass} relative grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16`}>
        <div className="flex flex-col gap-5">
          <Breadcrumbs items={crumbs} />
          <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
            <span className="inline-block h-px w-8 bg-primary" />
            {content.eyebrow}
          </span>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{content.lead}</p>
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
            {showVentCalculator && <Button size="lg" className="h-12 px-6" render={<Link href={ventPage.path} />}>Калькулятор продухов<ArrowRight data-icon="inline-end" /></Button>}
            <Button size="lg" className="h-12 px-6" render={<Link href="/#contacts" />}>
              Рассчитать стоимость
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6" render={<a href={`tel:${site.phone}`} />}>
              {site.phoneDisplay}
            </Button>
          </div>
        </div>
        {content.imageAlt && (
          <Reveal delay={150} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
              <Image src={content.image} alt={content.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
            <div className="absolute -left-3 -top-3 size-6 border-l-2 border-t-2 border-primary" aria-hidden="true" />
            <div className="absolute -bottom-3 -right-3 size-6 border-b-2 border-r-2 border-primary" aria-hidden="true" />
          </Reveal>
        )}
      </div>
    </section>
  )
}

function IntroBlock({ content }: { content: PageContent }) {
  return (
    <section className="py-16 sm:py-20">
      <div className={`${sectionClass} grid gap-10 lg:grid-cols-[1.4fr_0.6fr]`}>
        <div className="flex flex-col gap-5">
          {content.intro.map((paragraph, index) => (
            <Reveal key={index} delay={index * 60}>
              <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{paragraph}</p>
            </Reveal>
          ))}
        </div>
        {content.features && (
          <Reveal delay={120} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">Коротко о главном</span>
            <ul className="flex flex-col gap-4">
              {content.features.map((feature) => (
                <li key={feature.title} className="flex gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <CircleDot className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-bold">{feature.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  )
}

function RichBlocks({ content }: { content: PageContent }) {
  if (!content.blocks) return null
  return (
    <section className="border-t border-border py-16 sm:py-20">
      <div className={`${sectionClass} flex flex-col gap-16 sm:gap-24`}>
        {content.blocks.map((block, index) => (
          <Reveal key={block.heading}>
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <div className={`flex flex-col gap-5 ${block.reverse ? "lg:order-2" : ""}`}>
                <span className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="inline-block h-px w-8 bg-primary" />
                </span>
                <h2 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-3xl">{block.heading}</h2>
                {block.paragraphs?.map((paragraph, i) => (
                  <p key={i} className="text-pretty leading-relaxed text-muted-foreground">{paragraph}</p>
                ))}
                {block.list && (
                  <ul className="flex flex-col gap-3">
                    {block.list.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                        <span className="leading-relaxed text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {block.callout && (
                  <p className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-pretty text-sm font-medium leading-relaxed text-foreground">
                    {block.callout}
                  </p>
                )}
              </div>
              {block.image && (
                <div className={`relative ${block.reverse ? "lg:order-1" : ""}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
                    <Image src={block.image} alt={block.imageAlt ?? ""} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
                  </div>
                  <div className="absolute -left-3 -top-3 size-6 border-l-2 border-t-2 border-primary" aria-hidden="true" />
                  <div className="absolute -bottom-3 -right-3 size-6 border-b-2 border-r-2 border-primary" aria-hidden="true" />
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function RelatedLinks({ content }: { content: PageContent }) {
  if (!content.related?.length) return null
  return (
    <section className="border-t border-border py-16 sm:py-20">
      <div className={sectionClass}>
        <SectionHeading eyebrow="Смежные услуги" title="Что ещё может пригодиться" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.related.map((item, index) => (
            <Reveal key={item.href} delay={index * 60}>
              <Link
                href={item.href}
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="absolute -right-2 -top-2 size-5 border-r-2 border-t-2 border-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                  Подробнее
                  <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function LegalBlock({ content }: { content: PageContent }) {
  if (!content.legal) return null
  return (
    <section className="py-16 sm:py-20">
      <div className={`${sectionClass} flex max-w-3xl flex-col gap-5`}>
        {content.legal.map((paragraph, index) => (
          <p key={index} className="text-pretty leading-relaxed text-muted-foreground">{paragraph}</p>
        ))}
        <Link href="/" className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <Check className="size-4" />
          Вернуться на главную
        </Link>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section className="border-t border-border py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 lg:px-6">
        <SectionHeading eyebrow="Вопросы и ответы" title="Час��ые вопросы" />
        <FAQ />
      </div>
    </section>
  )
}

const sectionMap = {
  services: ServiceCards,
  benefits: Benefits,
  pricing: PricingTable,
  process: ProcessSteps,
  works: WorksGrid,
  locations: LocationsGrid,
  faq: FaqSection,
} as const

export function InternalPageBody({ content, showVentCalculator = false }: { content: PageContent; showVentCalculator?: boolean }) {
  return (
    <>
      {content.intro.length > 0 && <IntroBlock content={content} />}
      {showVentCalculator && <VentCalculatorPromo />}
      <RichBlocks content={content} />
      <RelatedLinks content={content} />
      <LegalBlock content={content} />
      {content.sections.map((key) => {
        const Section = sectionMap[key]
        return <Section key={key} />
      })}
    </>
  )
}
