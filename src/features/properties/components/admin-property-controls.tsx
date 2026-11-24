"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAdminPropertyAction,
  updateAdminPropertyPublicationAction,
} from "@/features/properties/actions/admin-property-actions";
import { EMPTY_ADMIN_PROPERTY_STATE } from "@/features/properties/schemas/admin-property";
import type { PropertyStatus, PropertyVisibility } from "@/features/properties/types/property";

type PublicationFormProps = {
  propertyId: string;
  status: PropertyStatus;
  visibility: PropertyVisibility;
  publicationStatus: string;
  featured: boolean;
};

export function PropertyPublicationForm(props: PublicationFormProps) {
  const [state, formAction, pending] = useActionState(updateAdminPropertyPublicationAction, EMPTY_ADMIN_PROPERTY_STATE);
  return (
    <form action={formAction} className="admin-property-publication-form">
      <input name="propertyId" type="hidden" value={props.propertyId} />
      <label>Estado<select defaultValue={props.status} name="status"><option value="available">Disponible</option><option value="in_deal">En trato</option><option value="sold">Vendida</option></select></label>
      <label>Visibilidad<select defaultValue={props.visibility} name="visibility"><option value="public">Pública</option><option value="premium">Premium</option><option value="both">Ambas</option></select></label>
      <label>Publicación<select defaultValue={props.publicationStatus} name="publicationStatus"><option value="draft">Borrador</option><option value="pending">Pendiente</option><option value="approved">Aprobada</option><option value="rejected">Rechazada</option><option value="archived">Archivada</option></select></label>
      <label>Destacada<select defaultValue={String(props.featured)} name="featured"><option value="false">No</option><option value="true">Sí</option></select></label>
      <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Guardando…" : "Actualizar"}</button>
      {state.message ? <p aria-live="polite" className={`admin-property-feedback admin-property-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}

export function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const remove = () => {
    if (!window.confirm("Se eliminarán la propiedad y sus fotografías de Storage. ¿Continuar?")) return;
    startTransition(async () => {
      const result = await deleteAdminPropertyAction(propertyId);
      if (result.status === "error") window.alert(result.message);
      router.refresh();
    });
  };
  return <button className="button button--secondary button--small" disabled={pending} onClick={remove} type="button">{pending ? "Eliminando…" : "Eliminar propiedad"}</button>;
}
