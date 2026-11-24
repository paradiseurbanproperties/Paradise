import Link from "next/link";
import Image from "next/image";
import { getPublicSiteSettings } from "@/features/site-settings/repositories/site-settings-repository";

export async function SiteFooter() {
  const settings = await getPublicSiteSettings();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link aria-label="Paradise Bienes Raíces, ir al inicio" className="site-footer__brand" href="/">
          <Image
            alt="Paradise Bienes Raíces"
            className="site-logo site-logo--footer"
            height={400}
            src="/logos/paradise.png"
            width={600}
          />
        </Link>
        <p className="site-footer__message">{settings.tagline}</p>
        {settings.publicEmail ? <p><a href={`mailto:${settings.publicEmail}`}>{settings.publicEmail}</a></p> : null}
        {settings.publicPhone ? <p><a href={`tel:${settings.publicPhone.replace(/[^+\d]/g, "")}`}>{settings.publicPhone}</a></p> : null}
        <p className="site-footer__copyright">© {new Date().getFullYear()} {settings.siteName}</p>
      </div>
    </footer>
  );
}
