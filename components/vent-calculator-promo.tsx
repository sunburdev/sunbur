import Link from "next/link"
import { ArrowUpRight, Box, Check } from "lucide-react"
import { ventPage } from "@/lib/vent-page"

export function VentCalculatorPromo() {
  return (
    <section className="border-y border-border bg-card py-14 sm:py-20" aria-labelledby="vent-promo-title">
      <div className="mx-auto grid max-w-7xl items-center gap-9 px-4 lg:grid-cols-[1.3fr_0.7fr] lg:px-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-primary uppercase"><Box className="size-4" /> Бесплатный онлайн-инструмент</p>
          <h2 id="vent-promo-title" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Сколько продухов нужно вашему фундаменту?</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">Соберите цоколь в 3D: задайте форму, размеры и внутренние стены. Калькулятор покажет предварительную расстановку отверстий и поможет сравнить диаметры по стоимости бурения.</p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["3D-модель и план", "Сравнение диаметров", "Сохранение схемы"].map((label) => <li key={label} className="flex items-center gap-2"><Check className="size-4 text-primary" />{label}</li>)}
          </ul>
          <Link href={ventPage.path} className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Открыть калькулятор продухов<ArrowUpRight className="size-5" /></Link>
          <p className="mt-3 text-xs text-muted-foreground">Без регистрации. Расчёт не заменяет проверку конструкции перед бурением.</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5" aria-hidden="true">
          <svg viewBox="0 0 400 260" fill="none" className="mx-auto w-full max-w-sm">
            <path d="M35 140 230 36 370 111 175 219Z" fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeOpacity=".13" />
            <path d="M58 129 230 39 349 105 177 197Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeOpacity=".5" />
            <path d="M73 128 230 47 333 105 177 187Z" fill="var(--background)" stroke="currentColor" strokeOpacity=".3" />
            <path d="M58 129V157L177 225V197ZM177 197V225L349 133V105Z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeOpacity=".5" />
            <path d="M73 128V145L230 63V47ZM230 47V63L317 112L333 105Z" fill="currentColor" fillOpacity=".2" />
            {[{ x: 88, y: 155 }, { x: 143, y: 186 }, { x: 215, y: 191 }, { x: 268, y: 163 }, { x: 321, y: 135 }, { x: 123, y: 108 }, { x: 183, y: 77 }].map(({ x, y }) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4" ry="5" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />)}
          </svg>
          <p className="text-center font-mono text-xs text-muted-foreground">Ваш фундамент · понятная схема · сравнение цен</p>
        </div>
      </div>
    </section>
  )
}
