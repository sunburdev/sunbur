import Link from "next/link"
import { ArrowUpRight, CircleDashed, Ruler, Camera, Wind, Calculator, Droplets, MoveUpRight, Waves, Pipette, Sparkles } from "lucide-react"
import { toolsCatalog, toolPath, type ToolId } from "@/lib/tools-catalog"

const icons = { angle: MoveUpRight, airflow: Waves, sealant: Pipette, diameter: CircleDashed, slope: Ruler, equipment: Wind, estimate: Calculator, moisture: Droplets, photo: Camera } satisfies Record<ToolId, typeof Ruler>
const newTools: ToolId[] = ["angle", "airflow", "sealant"]

export function ToolsPromo() {
  return <section id="tools" aria-labelledby="tools-promo-title" className="scroll-mt-24 border-y border-border bg-card py-14 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-primary"><Sparkles size={15} /> ИНСТРУМЕНТЫ SUNBUR</p>
          <h2 id="tools-promo-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">От вопроса — к понятной схеме</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Выберите задачу, задайте размеры и посмотрите результат. В каждом инструменте — наглядный расчёт, сохранение проекта и AI-помощник.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" href="/instrumenty">Весь каталог · {toolsCatalog.length}<ArrowUpRight size={18} /></Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toolsCatalog.map(tool => {
          const Icon = icons[tool.id]
          return <Link key={tool.id} href={toolPath(tool.id)} className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:p-6">
            <div className="mb-5 flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={22} /></span>{newTools.includes(tool.id) ? <span className="rounded-full border border-primary/25 px-2 py-1 font-mono text-[10px] text-primary">НОВОЕ</span> : <span className="text-xs text-muted-foreground">{tool.category}</span>}</div>
            <h3 className="flex items-center justify-between gap-2 text-lg font-semibold tracking-tight">{tool.short}<ArrowUpRight className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" size={18} /></h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
          </Link>
        })}
      </div>
      <Link href="/kalkulyator-produhov" className="mt-4 flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-5 py-4 text-sm transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><span><strong>Продухи в фундаменте · 3D-конструктор</strong><span className="mt-1 block text-muted-foreground">Постройте цоколь, разместите отверстия и сравните варианты.</span></span><ArrowUpRight size={21} className="shrink-0 text-primary" /></Link>
    </div>
  </section>
}
