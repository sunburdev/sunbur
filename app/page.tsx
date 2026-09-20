import { Footer } from "@/components/footer"
import { VentCalculatorPromo } from "@/components/vent-calculator-promo"
import { ToolsPromo } from "@/components/tools-promo"
import { FAQ, Header, MobileCTA } from "@/components/site-interactive"
import { BeforeAfter, Benefits, ContactCTA, Hero, LocationsGrid, MasterBlock, PricingTable, ProcessSteps, SectionHeading, ServiceCards, WorksGrid } from "@/components/site-sections"
import { faqs, localBusinessSchema } from "@/lib/site-data"

export default function Page() {
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }

  return (
    <>
      <Header />
      <main>
        <Hero />
        <ToolsPromo />
        <PricingTable />
        <ServiceCards />
        <VentCalculatorPromo />
        <Benefits />
        <WorksGrid />
        <BeforeAfter />
        <ProcessSteps />
        <LocationsGrid />
        <MasterBlock />
        <section id="faq" className="py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 lg:px-6">
            <SectionHeading eyebrow="Вопросы и ответы" title="Что важно знать до бурения" text="Если вашего вопроса нет в списке — отправьте фото и коротко опишите задачу." />
            <FAQ />
          </div>
        </section>
        <ContactCTA />
      </main>
      <Footer />
      <MobileCTA />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}
