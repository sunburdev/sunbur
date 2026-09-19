import type { MetadataRoute } from "next"
import { locationSlug } from "@/lib/content"
import { locations, works } from "@/lib/site-data"
import { ventPage } from "@/lib/vent-page"
import { toolsCatalog, toolPath } from "@/lib/tools-catalog"

const staticPaths = ["", "/uslugi/", "/uslugi/almaznoe-burenie/", "/uslugi/burenie-betona/", "/uslugi/burenie-zhelezobetona/", "/uslugi/burenie-kirpicha/", "/uslugi/otverstiya-pod-ventilyaciyu/", "/uslugi/otverstiya-pod-kanalizaciyu/", "/uslugi/produhi-v-fundamente/", "/uslugi/burenie-fundamenta/", "/ceny/", "/works/", "/rayony/", "/contacts/"]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const locationPaths = locations.map((location) => `/${locationSlug(location)}/`)
  const workPaths = works.map((work) => `${work.href.replace(/\/$/, "")}/`)
  const paths = [...staticPaths, ventPage.path, "/instrumenty", ...toolsCatalog.map(tool => toolPath(tool.id)), ...locationPaths, ...workPaths]
  return paths.map((path) => ({ url: `https://sunbur.ru${path}`, lastModified: now, changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.7 }))
}
