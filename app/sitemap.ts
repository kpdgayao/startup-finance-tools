import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/constants";

const BASE_URL = "https://startupfinance.tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const toolPages: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: `${BASE_URL}${tool.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...toolPages];
}
