"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, Phone, Send } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { faqs, navigation, site } from "@/lib/site-data"

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "border-border bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70" : "border-transparent bg-background"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="SUNBUR — на главную">
          <BrandMark />
          <span className="flex flex-col leading-none">
            <strong className="font-mono text-lg tracking-tight">SUNBUR</strong>
            <small className="mt-1 text-[11px] text-muted-foreground">Алмазное бурение</small>
          </span>
        </Link>
        <nav className="hidden items-center gap-4 xl:flex" aria-label="Основная навигация">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="group relative text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <a href={`tel:${site.phone}`} className="font-mono text-sm font-bold">{site.phoneDisplay}</a>
          <Button size="lg" render={<Link href="/#contacts" />}>Связаться</Button>
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-lg" className="xl:hidden" aria-label="Открыть меню" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-mono">SUNBUR — меню</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Мобильная навигация">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="border-b border-border py-3 text-base font-medium">{item.label}</Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 p-4">
              <a href={`tel:${site.phone}`} className="font-mono text-lg font-bold">{site.phoneDisplay}</a>
              <Button render={<Link href="/#contacts" />}>Связаться</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export function FAQAccordion({ items }: { items: string[][] }) {
  return (
    <Accordion className="border-t border-border">
      {items.map(([question, answer]) => (
        <AccordionItem key={question} value={question} className="border-b border-border">
          <AccordionTrigger className="py-5 text-base font-semibold sm:text-lg">{question}</AccordionTrigger>
          <AccordionContent className="max-w-3xl pb-5 text-base leading-relaxed text-muted-foreground">{answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function FAQ() {
  return <FAQAccordion items={faqs as unknown as string[][]} />
}

export function MobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-2 backdrop-blur md:hidden">
      <Button size="lg" render={<a href={`tel:${site.phone}`} />}>
        <Phone data-icon="inline-start" />
        Позвонить
      </Button>
      <Button size="lg" variant="outline" render={<a href={site.whatsapp} target="_blank" rel="noreferrer" />}>
        <Send data-icon="inline-start" />
        Написать
      </Button>
    </div>
  )
}
