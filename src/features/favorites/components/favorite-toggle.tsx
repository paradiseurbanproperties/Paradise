"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setFavoriteAction, type FavoriteActionState } from "@/features/favorites/actions/favorite-actions";

const initialState: FavoriteActionState = { status: "idle", message: "", isFavorite: false };

export function FavoriteToggle({
  propertyId,
  isFavorite: initialFavorite,
  canFavorite,
  compact = false,
}: {
  propertyId: string;
  isFavorite: boolean;
  canFavorite: boolean;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(setFavoriteAction, { ...initialState, isFavorite: initialFavorite });
  if (!canFavorite) {
    return <Link aria-label="Inicia sesión como Cliente para guardar esta propiedad" className={`favorite-signin${compact ? " favorite-signin--compact" : ""}`} href="/login">♡ <span>Guardar</span></Link>;
  }

  const isFavorite = state.isFavorite;
  return (
    <form action={formAction} className={`favorite-toggle${compact ? " favorite-toggle--compact" : ""}`}>
      <input name="propertyId" type="hidden" value={propertyId} />
      <input name="intent" type="hidden" value={isFavorite ? "remove" : "add"} />
      <button
        aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        aria-pressed={isFavorite}
        className={`favorite-toggle__button${isFavorite ? " favorite-toggle__button--active" : ""}`}
        disabled={pending}
        type="submit"
      >
        <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
        <span>{pending ? "Guardando…" : isFavorite ? "Guardada" : "Guardar"}</span>
      </button>
      {state.message ? <span aria-live="polite" className={`favorite-toggle__feedback favorite-toggle__feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
    </form>
  );
}
