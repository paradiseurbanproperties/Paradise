"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { AuthActionState } from "@/features/auth/types/auth-action";
import { requestPropertyVisitAction } from "@/features/visits/actions/visit-actions";

export function VisitRequestForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [state, setState] = useState<AuthActionState>({ status: "idle", message: "" });
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const localStart = String(data.get("localStart") ?? "");
    const date = new Date(localStart);
    if (!localStart || !Number.isFinite(date.getTime())) {
      setState({ status: "error", message: "Selecciona una fecha y hora válidas." });
      return;
    }
    data.set("startsAt", date.toISOString());
    startTransition(async () => setState(await requestPropertyVisitAction(state, data)));
  }

  return (
    <section aria-labelledby="visit-request-title" className="visit-request-panel">
      <p className="eyebrow">Agenda una visita</p>
      <h2 id="visit-request-title">Conoce {propertyTitle}</h2>
      <p>Propón un horario. El equipo confirmará la disponibilidad desde tu cuenta.</p>
      <form className="visit-request-form" onSubmit={submit}>
        <input name="propertyId" type="hidden" value={propertyId} />
        <label className="auth-field">
          <span>Fecha y hora (zona local)</span>
          <input name="localStart" required type="datetime-local" />
        </label>
        <label className="auth-field">
          <span>Nota para el equipo (opcional)</span>
          <textarea maxLength={1000} name="message" rows={3} />
        </label>
        {state.message ? <p aria-live="polite" className={`visit-feedback visit-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
        <button className="button button--primary button--medium" disabled={pending} type="submit">{pending ? "Enviando…" : "Solicitar visita"}</button>
      </form>
      <small>La visita dura una hora. Solo puedes solicitar horarios dentro de los próximos 90 días.</small>
    </section>
  );
}
