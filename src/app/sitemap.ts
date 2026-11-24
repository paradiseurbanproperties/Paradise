import type { MetadataRoute } from "next";
import { listPublicAgents } from "@/features/agents/repositories/agent-repository";
import { listPublicPropertySitemapEntries } from "@/features/properties/repositories/property-repository";
import { getCanonicalUrl } from "@/lib/seo/site-url";

const publicPages = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/propiedades", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/propiedades/mapa", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/agentes", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/premium", priority: 0.5, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, agents] = await Promise.all([
    listPublicPropertySitemapEntries(),
    listPublicAgents(),
  ]);

  return [
    ...publicPages.map(({ path, priority, changeFrequency }) => ({
      url: getCanonicalUrl(path).toString(),
      priority,
      changeFrequency,
    })),
    ...properties.map((property) => ({
      url: getCanonicalUrl(`/propiedad/${encodeURIComponent(property.slug)}`).toString(),
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...agents.map((agent) => ({
      url: getCanonicalUrl(`/agentes/${encodeURIComponent(agent.slug)}`).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
