"use client";

import { useActionState } from "react";
import { publishDemoPropertiesAction } from "@/features/properties/actions/demo-property-actions";
import { EMPTY_ADMIN_PROPERTY_STATE } from "@/features/properties/schemas/admin-property";

export function DemoPropertiesPublisher() {
  const [state, formAction, pending] = useActionState(publishDemoPropertiesAction, EMPTY_ADMIN_PROPERTY_STATE);

  return (
    <div className="demo-properties-publisher">
      <div>
        <h3>Cargar cinco casas de demostración</h3>
        <p>Una sola acción crea fichas públicas, fotos en Storage, puntos aproximados y las destaca en portada. Las propiedades, precios y fotos se identificarán como ficticios.</p>
      </div>
      <form action={formAction}>
        <button className="button button--primary button--medium" disabled={pending} type="submit">
          {pending ? "Preparando fotos y publicaciones…" : "Publicar las cinco"}
        </button>
        {state.message ? (
          <p aria-live="polite" className={`admin-property-feedback admin-property-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
