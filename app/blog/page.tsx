import type { Metadata } from "next"
import { Footer } from "@/components/footer"
import { Header, MobileCTA } from "@/components/site-interactive"
import { Breadcrumbs, ContactCTA } from "@/components/site-sections"
import { BlogCard } from "@/components/blog"
import { blogPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Блог о бурении и вентиляции подполья | SUNBUR",
  description: "Экспертные статьи о продухах в фундаменте, вентиляции подполья и алмазном бурении: расчёты, нормы, диаметры и практические советы от мастера.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Блог о бурении и вентиляции подполья | SUNBUR",
    description: "Экспертные статьи о продухах, вентиляции подполья и алмазном бурении: расчёты, нормы и практические советы.",
    url: "/blog",
    siteName: "SUNBUR",
    locale: "ru_RU",
    type: "website",
  },
}

export default function BlogIndexPage() {
  const siteUrl = "https://sunbur.ru"
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${siteUrl}/blog` },
    ],
  }
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: blogPosts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/blog/${post.slug}`,
      name: post.title,
    })),
  }

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="absolute inset-0 hud-grid" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 lg:px-6 lg:py-16">
            <Breadcrumbs items={[{ label: "Блог" }]} />
            <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <span className="inline-block h-px w-8 bg-primary" />
              Блог
            </span>
            <h1 className="max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Про продухи, вентиляцию и алмазное бурение
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Разбираем частые вопросы простым языком: сколько нужно продухов, можно ли добавить их в готовый фундамент, какой диаметр брать под вентиляцию и кондиционер. С расчётами, нормами и наглядной инфографикой.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
            {blogPosts.map((post, index) => (
              <BlogCard key={post.slug} post={post} delay={(index % 3) * 60} />
            ))}
          </div>
        </section>

        <ContactCTA />
      </main>
      <Footer />
      <MobileCTA />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
    </>
  )
}
