import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { toolsCatalog, toolPath } from "@/lib/tools-catalog"
import { defaultToolInput } from "@/lib/home-tools"
import { ToolDiagram } from "@/components/tool-diagram"

export const metadata: Metadata = { title: "Онлайн-инструменты для дома и бурения | SUNBUR", description: "Бурение под углом, скорость воздуха, расход герметика, подбор отверстий, уклон, смета и задание по фото. Наглядные расчёты с AI-помощником.", alternates: { canonical: "https://sunbur.ru/instrumenty" } }
export default function ToolsPage() {
  return <main className="tools-main"><nav className="tools-crumb" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><span>Инструменты</span></nav><div className="tools-hub-intro"><span className="tools-eyebrow">МАСТЕРСКАЯ SUNBUR</span><h1>Сначала — понятный план.<br /><em>Потом — точная работа.</em></h1><p>Рассчитайте размеры, сравните стоимость и подготовьте задание мастеру. Наглядные инструменты с помощником, который учитывает вашу задачу.</p><span className="tools-badge"><Sparkles size={15} /> AI-помощник в каждом инструменте</span></div><div className="tools-card-grid">{toolsCatalog.map((tool, i) => <Link href={toolPath(tool.id)} className="tools-card" key={tool.id}><div className="tools-card-art"><ToolDiagram input={defaultToolInput(tool.id)} /></div><div className="tools-card-copy"><span className="tools-eyebrow">0{i + 1} / {tool.category}</span><h2>{tool.short}<ArrowUpRight size={22} /></h2><p>{tool.description}</p><span className="tools-card-action">Открыть инструмент</span></div></Link>)}</div><Link className="tools-vent-link" href="/kalkulyator-produhov"><div><span className="tools-eyebrow">ЕЩЁ ОДИН ИНСТРУМЕНТ</span><h2>Ваш фундамент в 3D</h2><p>Конструктор продухов: форма цоколя, размещение отверстий и сравнение вариантов.</p></div><ArrowUpRight size={32} /></Link></main>
}
