"use client";

import Link from "next/link";
import { useActionState } from "react";
import { manageFavoriteListAction, setFavoriteListPropertyAction } from "@/features/favorites/actions/favorite-list-actions";
import { EMPTY_FAVORITE_LIST_ACTION_STATE } from "@/features/favorites/types/favorite-list";
import type { FavoriteListSummary } from "@/features/favorites/repositories/favorite-list-repository";

export function FavoriteListManager({ lists, unavailable }: { lists: FavoriteListSummary[]; unavailable: boolean }) {
  const [state, action, pending] = useActionState(manageFavoriteListAction, EMPTY_FAVORITE_LIST_ACTION_STATE);
  return (
    <section className="favorite-lists" aria-labelledby="favorite-lists-heading">
      <div className="favorite-lists__heading">
        <div><p className="eyebrow">Organiza lo que te interesa</p><h2 id="favorite-lists-heading">Mis listas</h2></div>
        <span>{lists.length} {lists.length === 1 ? "lista" : "listas"}</span>
      </div>
      {unavailable ? <p className="favorite-list-feedback favorite-list-feedback--error" role="alert">No se pudieron cargar las listas. Comprueba que la migración 0015 esté aplicada.</p> : null}
      <form action={action} className="favorite-list-create">
        <input name="intent" type="hidden" value="create" />
        <label className="sr-only" htmlFor="new-favorite-list-name">Nombre de la lista</label>
        <input autoComplete="off" id="new-favorite-list-name" maxLength={40} name="name" placeholder="Ej. Casas para visitar" required />
        <button className="button button--primary button--small" disabled={pending} type="submit">{pending ? "Creando…" : "Crear lista"}</button>
      </form>
      {state.message ? <p className={`favorite-list-feedback favorite-list-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      {lists.length ? (
        <ul className="favorite-list-grid">
          {lists.map((list) => <FavoriteListCard key={list.id} list={list} />)}
        </ul>
      ) : <p className="favorite-list-empty">Crea tu primera lista para agrupar propiedades guardadas.</p>}
    </section>
  );
}

function FavoriteListCard({ list }: { list: FavoriteListSummary }) {
  const [state, action, pending] = useActionState(manageFavoriteListAction, EMPTY_FAVORITE_LIST_ACTION_STATE);
  return (
    <li className="favorite-list-card">
      <div className="favorite-list-card__title">
        <Link href={`/favoritos/listas/${list.id}`}><strong>{list.name}</strong><span>{list.propertyIds.length} {list.propertyIds.length === 1 ? "propiedad" : "propiedades"}</span></Link>
      </div>
      <form action={action} className="favorite-list-rename">
        <input name="intent" type="hidden" value="rename" />
        <input name="listId" type="hidden" value={list.id} />
        <label className="sr-only" htmlFor={`rename-list-${list.id}`}>Nuevo nombre para {list.name}</label>
        <input autoComplete="off" defaultValue={list.name} id={`rename-list-${list.id}`} maxLength={40} name="name" required />
        <button aria-label={`Guardar nombre de ${list.name}`} disabled={pending} type="submit">Guardar</button>
      </form>
      <form action={action} onSubmit={(event) => { if (!window.confirm(`¿Eliminar la lista “${list.name}” y su organización?`)) event.preventDefault(); }}>
        <input name="intent" type="hidden" value="delete" />
        <input name="listId" type="hidden" value={list.id} />
        <button className="favorite-list-delete" disabled={pending} type="submit">Eliminar lista</button>
      </form>
      {state.message ? <p className={`favorite-list-feedback favorite-list-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </li>
  );
}

export function FavoriteListPropertyPicker({
  listId,
  candidates,
}: {
  listId: string;
  candidates: Array<{ id: string; title: string }>;
}) {
  const [state, action, pending] = useActionState(setFavoriteListPropertyAction, EMPTY_FAVORITE_LIST_ACTION_STATE);

  return (
    <form action={action} className="favorite-list-picker">
      <input name="intent" type="hidden" value="add" />
      <input name="listId" type="hidden" value={listId} />
      <label htmlFor={`list-property-${listId}`}>Agregar desde tus favoritos</label>
      <select defaultValue="" id={`list-property-${listId}`} name="propertyId" required>
        <option disabled value="">Elige una propiedad</option>
        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
      </select>
      <button className="button button--primary button--small" disabled={pending || !candidates.length} type="submit">Agregar</button>
      {state.message ? <span className={`favorite-list-feedback favorite-list-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
    </form>
  );
}

export function RemoveFavoriteListProperty({ listId, propertyId, title }: { listId: string; propertyId: string; title: string }) {
  const [state, action, pending] = useActionState(setFavoriteListPropertyAction, EMPTY_FAVORITE_LIST_ACTION_STATE);
  return (
    <form action={action} className="favorite-list-remove-property">
      <input name="intent" type="hidden" value="remove" />
      <input name="listId" type="hidden" value={listId} />
      <input name="propertyId" type="hidden" value={propertyId} />
      <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Quitando…" : `Quitar ${title} de la lista`}</button>
      {state.message ? <span className={`favorite-list-feedback favorite-list-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
    </form>
  );
}

