import type { MetadataRoute } from "next";
import { getCanonicalUrl, getSiteOrigin } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/agente/",
        "/mi-cuenta",
        "/favoritos",
        "/mi-actividad",
        "/notificaciones",
        "/comparar",
        "/login",
        "/registro",
        "/recuperar-password",
        "/verificar-email",
        "/auth/",
        "/api/",
      ],
    },
    sitemap: getCanonicalUrl("/sitemap.xml").toString(),
    host: getSiteOrigin().host,
  };
}
