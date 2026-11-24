"use client";

import { useActionState } from "react";
import { submitPropertyInquiryAction } from "@/features/crm/actions/lead-actions";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialState: AuthActionState = { status: "idle", message: "" };

export function PropertyInquiryForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [state, formAction, pending] = useActionState(submitPropertyInquiryAction, initialState);
  return (
    <section aria-labelledby="property-inquiry-title" className="property-inquiry-panel">
      <p className="eyebrow">Da el siguiente paso</p>
      <h2 id="property-inquiry-title">Solicita información</h2>
      <p>El equipo de Paradise responderá sobre esta propiedad. No compartiremos tus datos en el directorio público.</p>
      <form action={formAction} className="property-inquiry-form">
        <input name="propertyId" type="hidden" value={propertyId} />
        <label className="auth-field"><span>Tu nombre</span><input autoComplete="name" maxLength={120} name="senderName" required /></label>
        <label className="auth-field"><span>Correo electrónico</span><input autoComplete="email" maxLength={254} name="senderEmail" required type="email" /></label>
        <label className="auth-field"><span>¿Qué te gustaría saber?</span><textarea maxLength={2000} minLength={5} name="message" required rows={4} /></label>
        <label className="property-inquiry-consent">
          <input name="privacyConsent" required type="checkbox" />
          <span>Acepto que Paradise use estos datos para responder a mi consulta.</span>
        </label>
        <label aria-hidden="true" className="property-inquiry-honeypot" tabIndex={-1}>
          Sitio web<input autoComplete="off" name="website" tabIndex={-1} />
        </label>
        {state.message ? <p aria-live="polite" className={`property-inquiry-feedback property-inquiry-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
        <button className="button button--primary button--medium" disabled={pending} type="submit">{pending ? "Enviando…" : "Enviar consulta"}</button>
      </form>
      <small>Consulta sobre: {propertyTitle}. Se limita la frecuencia de envíos desde el mismo correo.</small>
    </section>
  );
}
