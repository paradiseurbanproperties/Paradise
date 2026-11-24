import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { ReactNode } from "react";

type AuthPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternate?: { label: string; href: string; linkText: string };
};

export function AuthPage({ eyebrow, title, description, children, alternate }: AuthPageProps) {
  const isConfigured = Boolean(getSupabasePublicConfig());

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main auth-main" id="main-content">
        <section aria-labelledby="auth-title" className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-card__description">{description}</p>
          {!isConfigured ? (
            <p className="auth-setup-note" role="status">
              La autenticación se habilitará al configurar las variables del proyecto Supabase en `.env.local`.
            </p>
          ) : null}
          {children}
          {alternate ? (
            <p className="auth-card__alternate">
              {alternate.label} <Link href={alternate.href}>{alternate.linkText}</Link>
            </p>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
