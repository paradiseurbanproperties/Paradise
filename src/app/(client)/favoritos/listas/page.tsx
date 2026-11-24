import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { FavoriteListManager } from "@/features/favorites/components/favorite-list-manager";
import { listOwnFavoriteLists } from "@/features/favorites/repositories/favorite-list-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mis listas" };

export default async function FavoriteListsPage() {
  await requireProfileRole(["client"]);
  const { lists, unavailable } = await listOwnFavoriteLists();

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main favorites-main" id="main-content">
        <div className="favorites-content">
          <Link className="favorite-list-back" href="/favoritos">← Volver a mis favoritos</Link>
          <header className="favorites-heading">
            <p className="eyebrow">Tu espacio Paradise</p>
            <h1>Mis listas</h1>
            <p>Organiza tus propiedades favoritas por proyecto, zona o lo que necesites.</p>
          </header>
          <FavoriteListManager lists={lists} unavailable={unavailable} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
