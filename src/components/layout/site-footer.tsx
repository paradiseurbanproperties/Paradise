import Link from "next/link";
import { getPublicSiteSettings } from "@/features/site-settings/repositories/site-settings-repository";

export async function SiteFooter() {
  const settings = await getPublicSiteSettings();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__identity">
          <Link aria-label="Paradise Bienes Raíces, ir al inicio" className="site-footer__brand" href="/">{settings.siteName}</Link>
          <p className="site-footer__message">{settings.tagline}</p>
        </div>
        <nav aria-label="Enlaces del pie de página" className="site-footer__links">
          <Link href="/propiedades">Propiedades</Link>
          <Link href="/propiedades/mapa">Mapa</Link>
          <Link href="/agentes">Agentes</Link>
        </nav>
        <div className="site-footer__contact">
          {settings.publicEmail ? <a href={`mailto:${settings.publicEmail}`}>{settings.publicEmail}</a> : null}
          {settings.publicPhone ? <a href={`tel:${settings.publicPhone.replace(/[^+\d]/g, "")}`}>{settings.publicPhone}</a> : null}
        </div>
        <p className="site-footer__copyright">© {new Date().getFullYear()} {settings.siteName}</p>
      </div>
    </footer>
  );
}
