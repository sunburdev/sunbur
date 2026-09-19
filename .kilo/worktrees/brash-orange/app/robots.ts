import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://sunbur.ru/sitemap.xml",
    host: "https://sunbur.ru",
  }
}
