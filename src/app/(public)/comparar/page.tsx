import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ComparisonPage } from "@/features/comparison/components/comparison-page";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";

export const metadata = { title: "Comparar propiedades", robots: { index: false, follow: false } };

export default async function ComparePropertiesPage() {
  const properties = await listPublicProperties();
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main comparison-main" id="main-content">
        <ComparisonPage properties={properties} />
      </main>
      <SiteFooter />
    </div>
  );
}
