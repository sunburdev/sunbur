import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Footer } from "@/components/footer"
import { Header, MobileCTA } from "@/components/site-interactive"
import { ContactCTA } from "@/components/site-sections"
import { InternalHero, InternalPageBody } from "@/components/internal-page"
import { getPageContent } from "@/lib/content"
import { localBusinessSchema } from "@/lib/site-data"

const labels: Record<string, string> = {
  uslugi: "Услуги",
  "almaznoe-burenie": "Алмазное бурение",
  "burenie-betona": "Бурение бетона",
  "burenie-zhelezobetona": "Бурение железобетона",
  "burenie-kirpicha": "Бурение кирпича",
  "otverstiya-pod-ventilyaciyu": "Отверстия под вентиляцию",
  "otverstiya-pod-kanalizaciyu": "Отверстия под канализацию",
  "burenie-fundamenta": "Бурение фундамента",
  "produhi-v-fundamente": "Продухи в фундаменте",
  ceny: "Цены",
  works: "Наши работы",
  rayony: "Районы выезда",
  contacts: "Контакты",
  privacy: "Политика конфиденциальности",
  consent: "Согласие на обработку данных",
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const content = getPageContent(slug)
  if (!content) return { title: "SUNBUR" }
  const url = `/${slug.join("/")}`
  const title = `${content.title} | SUNBUR`
  return {
    title,
    description: content.lead,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: content.lead,
      url,
      siteName: "SUNBUR",
      locale: "ru_RU",
      type: "website",
      images: [{ url: content.image, alt: content.imageAlt || content.title }],
    },
  }
}

export default async function InternalPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const content = getPageContent(slug)
  if (!content) notFound()

  const crumbs = slug.map((part, index) => ({
    label: labels[part] ?? content.title,
    href: index < slug.length - 1 ? `/${slug.slice(0, index + 1).join("/")}` : undefined,
  }))

  const isContacts = slug.length === 1 && slug[0] === "contacts"
  const showVentCalculator = ["uslugi/produhi-v-fundamente", "uslugi/burenie-fundamenta", "uslugi/otverstiya-pod-ventilyaciyu"].includes(slug.join("/"))

  const siteUrl = "https://sunbur.ru"
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${siteUrl}/` },
      ...crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: crumb.label,
        item: `${siteUrl}${crumb.href ?? `/${slug.slice(0, index + 1).join("/")}`}`,
      })),
    ],
  }

  return (
    <>
      <Header />
      <main>
        <InternalHero content={content} crumbs={crumbs} showVentCalculator={showVentCalculator} />
        <InternalPageBody content={content} showVentCalculator={showVentCalculator} />
        <ContactCTA />
      </main>
      <Footer />
      <MobileCTA />
      {isContacts && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
