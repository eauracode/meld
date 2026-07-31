import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/riders", "/demo", "/pricing", "/terms", "/privacy"];
  return routes.map((route) => ({
    url: `${SITE.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
