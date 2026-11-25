"use client";

import { useActionState } from "react";
import { publishDemoPropertiesAction } from "@/features/properties/actions/demo-property-actions";
import { EMPTY_ADMIN_PROPERTY_STATE } from "@/features/properties/schemas/admin-property";

export function DemoPropertiesPublisher() {
  const [state, formAction, pending] = useActionState(publishDemoPropertiesAction, EMPTY_ADMIN_PROPERTY_STATE);

  return (
    <div className="demo-properties-publisher">
      <div>
        <h3>Actualizar selección residencial</h3>
        <p>Publica las propiedades ilustrativas que falten, actualiza sus descripciones y fotografías, y las destaca en portada. Si ya cargaste cinco, agrega las siete restantes.</p>
      </div>
      <form action={formAction}>
        <button className="button button--primary button--medium" disabled={pending} type="submit">
          {pending ? "Preparando las publicaciones…" : "Actualizar propiedades"}
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
