import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@/constants/theme";
import { ComparisonProvider } from "@/features/comparison/components/comparison-provider";
import { getPublicSiteSettings } from "@/features/site-settings/repositories/site-settings-repository";
import { getSiteOrigin } from "@/lib/seo/site-url";
import "./globals.css";
import "@/styles/tokens.css";

const themeBootstrapScript = `(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  let theme = "light";
  try {
    const savedTheme = window.localStorage.getItem(storageKey);
    theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();`;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const title = `${settings.siteName} | Propiedades inmobiliarias`;
  const description = settings.seoDescription || `Explora propiedades publicadas en ${settings.siteName}.`;
  return {
  metadataBase: getSiteOrigin(),
  icons: {
    icon: "/icons/paradise.png",
    apple: "/icons/paradise.png",
  },
  title: {
    default: title,
    template: `%s | ${settings.siteName}`,
  },
  applicationName: settings.siteName,
  description,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: settings.siteName,
    title,
    description,
    images: [{ url: "/icons/paradise.png", width: 435, height: 458, alt: "Logo de Paradise Bienes Raíces" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/icons/paradise.png"],
  },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
          id="paradise-theme-bootstrap"
        />
      </head>
      <body><ComparisonProvider>{children}</ComparisonProvider></body>
    </html>
  );
}
