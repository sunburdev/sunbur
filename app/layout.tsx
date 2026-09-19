import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { ChatWidget } from "@/components/chat-widget"
import "./globals.css"

const geist = Geist({ subsets: ["latin", "cyrillic"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL("https://sunbur.ru"),
  title: "Алмазное бурение в Солнечногорске — цены на сверление бетона | SUNBUR",
  description: "Алмазное бурение и сверление бетона, железобетона и кирпича в Солнечногорске и районе. Отверстия под вентиляцию, канализацию, кондиционеры и коммуникации. Расчет стоимости по фото.",
  alternates: { canonical: "/" },
  openGraph: { title: "Алмазное бурение в Солнечногорске | SUNBUR", description: "Частный мастер. Отверстия под коммуникации в бетоне, железобетоне и кирпиче.", url: "/", siteName: "SUNBUR", locale: "ru_RU", type: "website", images: [{ url: "/images/hero-drilling.png", width: 1536, height: 1024, alt: "Алмазное бурение профессиональной установкой" }] },
  robots: { index: true, follow: true },
  verification: { yandex: "d24cf922ccc237f1" },
}

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#1a1a1f", width: "device-width", initialScale: 1, userScalable: true }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`bg-background ${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <ChatWidget />
        <Script
          id="yandex-metrika"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                  m[i].l=1*new Date();
                  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=112468968', 'ym');

              ym(112468968, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
            `,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/112468968" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
      </body>
    </html>
  )
}
