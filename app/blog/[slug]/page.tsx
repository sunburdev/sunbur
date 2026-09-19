import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Footer } from "@/components/footer"
import { Header, MobileCTA } from "@/components/site-interactive"
import { ContactCTA } from "@/components/site-sections"
import { BlogHero, BlogArticleBody } from "@/components/blog"
import { blogPosts, getPost, getRelatedPosts } from "@/lib/blog"

const siteUrl = "https://sunbur.ru"

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: "SUNBUR" }
  const url = `/blog/${post.slug}`
  return {
    title: post.metaTitle,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.metaTitle,
      description: post.description,
      url,
      siteName: "SUNBUR",
      locale: "ru_RU",
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      images: [{ url: post.image, alt: post.imageAlt }],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const relatedPosts = getRelatedPosts(post)
  const crumbs = [
    { label: "Блог", href: "/blog" },
    { label: post.title },
  ]

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
    ],
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${siteUrl}${post.image}`,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: { "@type": "Person", name: "Максим Карпычев" },
    publisher: {
      "@type": "Organization",
      name: "SUNBUR",
      logo: { "@type": "ImageObject", url: `${siteUrl}/images/hero-drilling.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${post.slug}` },
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <Header />
      <main>
        <BlogHero post={post} crumbs={crumbs} />
        <BlogArticleBody post={post} relatedPosts={relatedPosts} />
        <ContactCTA />
      </main>
      <Footer />
      <MobileCTA />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}
