import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { findPublicAgentBySlug } from "@/features/agents/repositories/agent-repository";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = await findPublicAgentBySlug(slug);
  return agent ? {
    title: agent.publicName,
    description: agent.biography || `Perfil profesional de ${agent.publicName}.`,
    alternates: { canonical: `/agentes/${encodeURIComponent(agent.slug)}` },
  } : { title: "Agente no encontrado", robots: { index: false, follow: false } };
}

export default async function PublicAgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await findPublicAgentBySlug(slug);
  if (!agent) notFound();

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main agent-profile-main" id="main-content">
        <article className="agent-profile-card">
          <Link className="text-link" href="/agentes">← Directorio de agentes</Link>
          <div className="agent-profile-card__identity">
            <span aria-hidden="true" className="agent-public-card__avatar agent-public-card__avatar--large">{agent.publicName.trim()[0]?.toUpperCase() ?? "A"}</span>
            <div>
              <p className="eyebrow">Agente Paradise</p>
              <h1>{agent.publicName}</h1>
            </div>
          </div>
          {agent.biography ? <section><h2>Sobre mí</h2><p className="agent-profile-card__biography">{agent.biography}</p></section> : null}
          <div className="agent-profile-card__details">
            {agent.specialties.length ? <section><h2>Especialidades</h2><ul className="agent-tag-list">{agent.specialties.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
            {agent.serviceAreas.length ? <section><h2>Zonas de servicio</h2><ul className="agent-tag-list">{agent.serviceAreas.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          </div>
          <Link className="button button--primary" href="/propiedades">Explorar propiedades</Link>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
