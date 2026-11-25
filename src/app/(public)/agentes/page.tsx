import Link from "next/link";
import * as motion from "motion/react-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { listPublicAgents } from "@/features/agents/repositories/agent-repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentes inmobiliarios",
  description: "Conoce al equipo de agentes inmobiliarios de Paradise.",
  alternates: { canonical: "/agentes" },
};

export default async function AgentsDirectoryPage() {
  const agents = await listPublicAgents();
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main agents-directory-main" id="main-content">
        <div className="agents-directory-content">
          <motion.header
            animate={{ opacity: 1, y: 0 }}
            className="agents-directory-heading"
            initial={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Equipo Paradise</p>
            <h1>Agentes inmobiliarios</h1>
            <p>Perfiles profesionales publicados por nuestro equipo de administración.</p>
          </motion.header>
          {agents.length ? (
            <section aria-label="Agentes publicados" className="agents-directory-grid">
              {agents.map((agent, index) => (
                <motion.article
                  className="agent-public-card"
                  initial={{ opacity: 0, y: 22 }}
                  key={agent.profileId}
                  transition={{ delay: Math.min(index * 0.08, 0.4), duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ amount: 0.16, once: true }}
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 300, damping: 23 } }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <span aria-hidden="true" className="agent-public-card__avatar">{agent.publicName.trim()[0]?.toUpperCase() ?? "A"}</span>
                  <div className="agent-public-card__copy">
                    <p className="eyebrow">Asesoría inmobiliaria</p>
                    <h2>{agent.publicName}</h2>
                    {agent.biography ? <p>{agent.biography}</p> : <p>Consulta su perfil para conocer sus especialidades y zonas de servicio.</p>}
                    {agent.specialties.length ? <ul className="agent-tag-list">{agent.specialties.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}
                    <Link className="text-link" href={`/agentes/${agent.slug}`}>Ver perfil →</Link>
                  </div>
                </motion.article>
              ))}
            </section>
          ) : (
            <div className="agents-directory-empty">
              <span aria-hidden="true">✦</span>
              <h2>Estamos preparando el directorio</h2>
              <p>Los agentes aparecerán aquí cuando sus perfiles profesionales estén publicados.</p>
              <Link className="text-link" href="/propiedades">Explorar propiedades →</Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
