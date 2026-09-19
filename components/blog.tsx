import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, Check, Clock, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { site } from "@/lib/site-data"
import { Reveal } from "@/components/animations"
import { Breadcrumbs, SectionHeading } from "@/components/site-sections"
import { FAQAccordion } from "@/components/site-interactive"
import { infographics } from "@/components/blog-infographics"
import type { BlogPost, BlogBlock } from "@/lib/blog"

const sectionClass = "mx-auto max-w-5xl px-4 lg:px-6"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function BlogHero({ post, crumbs }: { post: BlogPost; crumbs: { label: string; href?: string }[] }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 hud-grid" aria-hidden="true" />
      <div className={`${sectionClass} relative flex flex-col gap-6 py-12 lg:py-16`}>
        <Breadcrumbs items={crumbs} />
        <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
          <span className="inline-block h-px w-8 bg-primary" />
          {post.category}
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            {formatDate(post.datePublished)}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {post.readingMinutes} мин чтения
          </span>
        </div>
        <Reveal delay={120} className="relative mt-2">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card">
            <Image src={post.image} alt={post.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 64rem" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
          </div>
          <div className="absolute -left-3 -top-3 size-6 border-l-2 border-t-2 border-primary" aria-hidden="true" />
          <div className="absolute -bottom-3 -right-3 size-6 border-b-2 border-r-2 border-primary" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  )
}

function TextBlock({ block }: { block: Extract<BlogBlock, { type: "text" }> }) {
  return (
    <div className="flex flex-col gap-5">
      {block.heading && <h2 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-3xl">{block.heading}</h2>}
      {block.paragraphs?.map((p, i) => (
        <p key={i} className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{p}</p>
      ))}
      {block.list && (
        <ul className="flex flex-col gap-3">
          {block.list.map((item) => (
            <li key={item} className="flex gap-3">
              <Check className="mt-1 size-5 shrink-0 text-primary" />
              <span className="leading-relaxed text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ImageBlock({ block }: { block: Extract<BlogBlock, { type: "image" }> }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-card">
        <Image src={block.src} alt={block.alt} fill sizes="(max-width: 1024px) 100vw, 64rem" className="object-cover" />
      </div>
      {block.caption && <figcaption className="text-sm italic leading-relaxed text-muted-foreground">{block.caption}</figcaption>}
    </figure>
  )
}

function CalloutBlock({ block }: { block: Extract<BlogBlock, { type: "callout" }> }) {
  const warning = block.variant === "warning"
  return (
    <div
      className={`flex gap-4 rounded-2xl border p-5 sm:p-6 ${warning ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}
    >
      {warning ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" /> : <Info className="mt-0.5 size-5 shrink-0 text-primary" />}
      <p className="text-pretty text-sm font-medium leading-relaxed text-foreground sm:text-base">{block.text}</p>
    </div>
  )
}

function StepsBlock({ block }: { block: Extract<BlogBlock, { type: "steps" }> }) {
  return (
    <div className="flex flex-col gap-5">
      {block.heading && <h2 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-3xl">{block.heading}</h2>}
      <ol className="grid gap-4 sm:grid-cols-2">
        {block.steps.map((step, i) => (
          <li key={step.title} className="relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
            <span className="font-mono text-2xl font-black tabular-nums text-primary/30">{String(i + 1).padStart(2, "0")}</span>
            <p className="font-bold leading-snug">{step.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function BlockRenderer({ block }: { block: BlogBlock }) {
  if (block.type === "infographic") {
    const Component = infographics[block.kind]
    return (
      <div className="flex flex-col gap-5">
        {block.heading && <h2 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-3xl">{block.heading}</h2>}
        <Component />
      </div>
    )
  }
  if (block.type === "text") return <TextBlock block={block} />
  if (block.type === "image") return <ImageBlock block={block} />
  if (block.type === "callout") return <CalloutBlock block={block} />
  if (block.type === "steps") return <StepsBlock block={block} />
  return null
}

function ArticleCta({ post }: { post: BlogPost }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {post.cta.map((item, index) => (
        <Reveal key={item.href} delay={index * 60}>
          <Link
            href={item.href}
            className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <div className="absolute -right-2 -top-2 size-5 border-r-2 border-t-2 border-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              {item.label}
              <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function BlogArticleBody({ post, relatedPosts }: { post: BlogPost; relatedPosts: BlogPost[] }) {
  return (
    <>
      <article className="py-16 sm:py-20">
        <div className={`${sectionClass} flex flex-col gap-5`}>
          {post.intro.map((p, i) => (
            <Reveal key={i} delay={i * 60}>
              <p className="text-pretty text-lg leading-relaxed text-foreground sm:text-xl">{p}</p>
            </Reveal>
          ))}
        </div>
        <div className={`${sectionClass} mt-14 flex flex-col gap-14 sm:gap-16`}>
          {post.blocks.map((block, index) => (
            <Reveal key={index}>
              <BlockRenderer block={block} />
            </Reveal>
          ))}
        </div>
      </article>

      <section className="border-t border-border py-16 sm:py-20">
        <div className={sectionClass}>
          <SectionHeading eyebrow="Что дальше" title="Полезно по теме" />
          <div className="mt-8">
            <ArticleCta post={post} />
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <div className={sectionClass}>
          <SectionHeading eyebrow="Вопросы и ответы" title="Частые вопросы по теме" />
          <div className="mt-8">
            <FAQAccordion items={post.faqs.map((f) => [f.q, f.a])} />
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="border-t border-border py-16 sm:py-20">
          <div className={sectionClass}>
            <SectionHeading eyebrow="Читайте также" title="Другие статьи" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related, index) => (
                <BlogCard key={related.slug} post={related} delay={index * 60} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export function BlogCard({ post, delay = 0 }: { post: BlogPost; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-background">
          <Image src={post.image} alt={post.imageAlt} fill sizes="(max-width: 1024px) 100vw, 24rem" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full border border-primary/40 bg-background/80 px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-primary backdrop-blur">
            {post.category}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center gap-4 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatDate(post.datePublished)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {post.readingMinutes} мин
            </span>
          </div>
          <h3 className="text-balance text-lg font-bold leading-snug transition-colors group-hover:text-primary">{post.title}</h3>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            Читать
            <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </Reveal>
  )
}
