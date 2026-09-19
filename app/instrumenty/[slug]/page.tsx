import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { toolsCatalog, toolPath } from "@/lib/tools-catalog"
import { ToolStudio } from "@/components/tool-studio"

export const dynamicParams = false
export function generateStaticParams() { return toolsCatalog.map(tool => ({ slug: tool.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tool = toolsCatalog.find(item => item.slug === slug)
  if (!tool) return {}
  const url = `https://sunbur.ru${toolPath(tool.id)}`
  return { title: `${tool.title} онлайн | SUNBUR`, description: tool.description, alternates: { canonical: url }, robots: { index: true, follow: true }, openGraph: { title: tool.title, description: tool.description, url, type: "website", images: ["/images/produkh-hole.png"] } }
}
export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = toolsCatalog.find(item => item.slug === slug)
  if (!tool) notFound()
  const url = `https://sunbur.ru${toolPath(tool.id)}`
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebApplication", name: tool.title, description: tool.description, url, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", isAccessibleForFree: true, inLanguage: "ru" },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Главная", item: "https://sunbur.ru/" }, { "@type": "ListItem", position: 2, name: "Инструменты", item: "https://sunbur.ru/instrumenty" }, { "@type": "ListItem", position: 3, name: tool.short, item: url }] },
  ] }
  return <main className="tools-main"><nav className="tools-crumb" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><Link href="/instrumenty">Инструменты</Link><span>/</span><span aria-current="page">{tool.short}</span></nav><ToolStudio key={tool.id} id={tool.id} /><section className="tools-guide"><span className="tools-eyebrow">КАК ПОЛЬЗОВАТЬСЯ</span><h2>{tool.title} онлайн</h2><p>{tool.guide}</p><div className="tools-guide-steps"><p><b>01 / Задайте параметры</b>Используйте реальные размеры и измерения своего объекта.</p><p><b>02 / Разберите результат</b>Схема меняется сразу. AI-помощник объяснит детали по вашему запросу.</p><p><b>03 / Сохраните и обсудите</b>Распечатайте расчёт и подтвердите условия работы с мастером.</p></div><Link href={tool.service}>Услуга и подготовка к работе ↗</Link><noscript><p>Для изменения параметров и общения с помощником включите JavaScript.</p></noscript></section><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /></main>
}
