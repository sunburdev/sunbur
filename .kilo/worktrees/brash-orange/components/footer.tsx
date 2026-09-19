import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"
import { navigation, operator, site } from "@/lib/site-data"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card pb-24 pt-14 text-foreground md:pb-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1.2fr_1fr] lg:px-6">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="SUNBUR — на главную">
            <BrandMark />
            <span className="font-mono text-2xl font-black">SUNBUR</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Алмазное бурение в Солнечногорске и Солнечногорском городском округе. Отверстия под коммуникации в бетоне, железобетоне и кирпиче.
          </p>
          <a href={`tel:${site.phone}`} className="mt-5 inline-block font-mono text-lg font-bold">{site.phoneDisplay}</a>
          <a href={`mailto:${site.email}`} className="mt-2 block text-sm text-muted-foreground transition-colors hover:text-foreground">{site.email}</a>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <nav aria-label="Навигация в подвале" className="flex flex-col items-start gap-3">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
            ))}
          </nav>
          <nav aria-label="Правовая информация" className="flex flex-col items-start gap-3">
            <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Политика конфиденциальности</Link>
            <Link href="/consent" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Согласие на обработку данных</Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-2 border-t border-border px-4 pt-6 text-xs text-muted-foreground sm:flex-row lg:px-6">
        <span>© {new Date().getFullYear()} SUNBUR</span>
        <span>
          Исполнитель: ИП {operator.name}
          {operator.inn ? `, ИНН ${operator.inn}` : ""}
          {operator.ogrn ? `, ОГРНИП ${operator.ogrn}` : ""} · {operator.region}
        </span>
      </div>
    </footer>
  )
}
