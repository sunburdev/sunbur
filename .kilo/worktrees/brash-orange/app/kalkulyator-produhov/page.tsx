import type { Metadata, Viewport } from "next"
import { VentExperience } from "@/components/vent-experience"
import { VentCalculatorGuide } from "@/components/vent-calculator-guide"
import { ventPage } from "@/lib/vent-page"
import "./studio.css"

export const metadata: Metadata = {
  title: ventPage.title,
  description: ventPage.description,
  alternates: { canonical: ventPage.url },
  robots: { index: true, follow: true },
  openGraph: { title: ventPage.title, description: ventPage.description, url: ventPage.url, siteName: "SUNBUR", locale: "ru_RU", type: "website", images: [{ url: "/images/produkh-hole.png", alt: "Продух в цокольном фундаменте" }] },
  twitter: { card: "summary_large_image", title: ventPage.title, description: ventPage.description, images: ["/images/produkh-hole.png"] },
}

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f6f6f3" }

export default function VentCalculatorPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", "@id": `${ventPage.url}#application`, name: "Калькулятор продухов SUNBUR", url: ventPage.url, description: ventPage.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", browserRequirements: "Для интерактивного расчёта необходим JavaScript", inLanguage: "ru", isAccessibleForFree: true, provider: { "@type": "Organization", name: "SUNBUR", url: "https://sunbur.ru/" }, featureList: ["3D-модель цокольного фундамента", "Предварительный подбор количества и диаметра продухов", "Сравнение стоимости бурения", "Сохранение и печать схемы"] },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Главная", item: "https://sunbur.ru/" }, { "@type": "ListItem", position: 2, name: "Калькулятор продухов", item: ventPage.url }] },
    ],
  }
  return <><VentExperience><VentCalculatorGuide /></VentExperience><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /></>
}
