import Image from "next/image";
import Link from "next/link";
import * as motion from "motion/react-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { getCurrentAccessContext } from "@/lib/permissions/access";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encuentra tu próximo hogar",
  description: "Explora propiedades publicadas y recibe acompañamiento inmobiliario para encontrar un espacio para ti.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [properties, access, favoriteState] = await Promise.all([
    listPublicProperties(),
    getCurrentAccessContext(),
    listOwnFavoritePropertyIds(),
  ]);
  const canFavorite = access?.role === "client" && access.status === "active";
  const showFavoriteControl = !access || canFavorite;
  const favoriteIds = new Set(favoriteState.ids);
  const featured = properties
    .filter((property) => property.featured)
    .slice(0, 12);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main home-main" id="main-content">
        <section aria-labelledby="home-title" className="intro">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="intro__copy"
            initial={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Paradise · Propiedades</p>
            <h1 className="intro__title" id="home-title">
              Encuentra un lugar que se sienta <em>tuyo.</em>
            </h1>
            <p className="intro__description">
              Encuentra espacios con personalidad y el acompañamiento necesario
              para elegir el siguiente lugar de tu historia.
            </p>

            <motion.form
              action="/propiedades"
              animate={{ opacity: 1, y: 0 }}
              className="home-search"
              initial={{ opacity: 0, y: 18 }}
              method="get"
              transition={{ delay: 0.26, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <label className="home-search__location">
                <span>¿Dónde te gustaría vivir?</span>
                <input name="q" placeholder="Ciudad, colonia o zona" type="search" />
              </label>
              <label className="home-search__type">
                <span>Tipo de espacio</span>
                <select defaultValue="" name="type">
                  <option value="">Todos</option>
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Casa de campo">Casa de campo</option>
                </select>
              </label>
              <button className="button button--primary button--large" type="submit">
                Explorar espacios <span aria-hidden="true">↗</span>
              </button>
            </motion.form>
            <p className="intro__note">
              <span aria-hidden="true" className="intro__note-dot" />
              Inventario actualizado desde Paradise
            </p>
          </motion.div>

          <motion.figure
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="intro-art"
            initial={{ opacity: 0, scale: 1.045, y: 18 }}
            transition={{ delay: 0.12, duration: 1, ease: [0.2, 0.75, 0.25, 1] }}
            whileHover={{ rotate: 0.4, scale: 1.012 }}
          >
            <div className="intro-art__frame">
              <Image
                alt="Sala luminosa con ventanales y materiales naturales"
                className="intro-art__image"
                fill
                priority
                sizes="(max-width: 760px) 90vw, 42vw"
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=84"
              />
            </div>
            <motion.figcaption
              animate={{ opacity: 1, x: 0 }}
              className="intro-art__caption"
              initial={{ opacity: 0, x: 18 }}
              transition={{ delay: 0.65, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="intro-art__caption-mark" aria-hidden="true">P.</span>
              <span><strong>Espacios para lo que viene</strong><small>Fotografía de inspiración</small></span>
            </motion.figcaption>
          </motion.figure>
        </section>

        <motion.section
          aria-labelledby="featured-title"
          className="featured-section"
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ amount: 0.12, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Una primera mirada</p>
              <h2 id="featured-title">Espacios con algo especial</h2>
            </div>
            <Link className="text-link" href="/propiedades">Explorar el catálogo ↗</Link>
          </div>
          {featured.length ? (
            <div className="property-grid">
              {featured.map((property, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  key={property.id}
                  transition={{ delay: index * 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ amount: 0.12, once: true }}
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 320, damping: 24 } }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <PropertyCard canFavorite={canFavorite} isFavorite={favoriteIds.has(property.id)} property={property} priority={index === 0} showFavoriteControl={showFavoriteControl} />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="catalog-empty">Pronto mostraremos las propiedades destacadas.</p>
          )}
        </motion.section>

        <motion.section
          aria-labelledby="home-tools-title"
          className="home-tools"
          initial={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ amount: 0.12, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Una búsqueda más sencilla</p>
              <h2 id="home-tools-title">Herramientas para decidir con calma</h2>
            </div>
          </div>
          <div className="home-tools__grid">
            <motion.article className="home-tool-card" initial={{ opacity: 0, y: 20 }} transition={{ delay: 0.02, duration: 0.55 }} viewport={{ once: true }} whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 22 } }} whileInView={{ opacity: 1, y: 0 }}>
              <span aria-hidden="true" className="home-tool-card__number">01</span>
              <div>
                <h3>Explora a tu manera</h3>
                <p>Filtra propiedades por zona, tipo y características. También puedes recorrerlas en el mapa.</p>
              </div>
              <Link className="text-link" href="/propiedades">Ver propiedades <span aria-hidden="true">↗</span></Link>
            </motion.article>
            <motion.article className="home-tool-card" initial={{ opacity: 0, y: 20 }} transition={{ delay: 0.1, duration: 0.55 }} viewport={{ once: true }} whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 22 } }} whileInView={{ opacity: 1, y: 0 }}>
              <span aria-hidden="true" className="home-tool-card__number">02</span>
              <div>
                <h3>Compara tus opciones</h3>
                <p>Guarda hasta cuatro espacios en la comparación para revisar sus detalles lado a lado.</p>
              </div>
              <Link className="text-link" href="/comparar">Abrir comparación <span aria-hidden="true">↗</span></Link>
            </motion.article>
            <motion.article className="home-tool-card" initial={{ opacity: 0, y: 20 }} transition={{ delay: 0.18, duration: 0.55 }} viewport={{ once: true }} whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 22 } }} whileInView={{ opacity: 1, y: 0 }}>
              <span aria-hidden="true" className="home-tool-card__number">03</span>
              <div>
                <h3>Habla con el equipo</h3>
                <p>En cada ficha puedes solicitar información de la propiedad que te interesa.</p>
              </div>
              <Link className="text-link" href="/agentes">Conocer agentes <span aria-hidden="true">↗</span></Link>
            </motion.article>
          </div>
        </motion.section>

        <motion.section
          aria-label="Explorar el catálogo"
          className="home-signature"
          initial={{ opacity: 0, y: 22, scale: 0.99 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ amount: 0.25, once: true }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
        >
          <div>
            <p className="eyebrow">Tu próxima búsqueda empieza aquí</p>
            <p>Revisa las opciones disponibles y encuentra tu siguiente paso.</p>
          </div>
          <Link className="button button--primary button--medium" href="/propiedades">
            Explorar propiedades <span aria-hidden="true">↗</span>
          </Link>
        </motion.section>
      </main>
      <SiteFooter />
    </div>
  );
}
