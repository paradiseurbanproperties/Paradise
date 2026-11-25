"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { AuthActionState } from "@/features/auth/types/auth-action";
import { cancelOwnVisitAction, changePropertyVisitAction } from "@/features/visits/actions/visit-actions";
import type { VisitStatus } from "@/features/visits/types/visit";

const idle: AuthActionState = { status: "idle", message: "" };

export function VisitManagementForm({ visitId, status }: { visitId: string; status: VisitStatus }) {
  const [state, setState] = useState(idle);
  const [pending, startTransition] = useTransition();
  const choices = status === "requested"
    ? [{ value: "confirmed", label: "Confirmar horario" }, { value: "declined", label: "Rechazar solicitud" }]
    : status === "confirmed"
      ? [{ value: "confirmed", label: "Guardar / reprogramar" }, { value: "cancelled", label: "Cancelar visita" }, { value: "completed", label: "Marcar realizada" }, { value: "no_show", label: "Marcar inasistencia" }]
      : [];
  if (!choices.length) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const localStart = String(data.get("localStart") ?? "");
    if (localStart) {
      const date = new Date(localStart);
      if (!Number.isFinite(date.getTime())) {
        setState({ status: "error", message: "Selecciona una nueva fecha y hora válida." });
        return;
      }
      data.set("startsAt", date.toISOString());
    }
    startTransition(async () => setState(await changePropertyVisitAction(state, data)));
  }

  return (
    <form className="visit-management-form" onSubmit={submit}>
      <input name="visitId" type="hidden" value={visitId} />
      <label className="auth-field"><span>Acción</span><select defaultValue={choices[0]?.value} name="status">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
      <label className="auth-field"><span>Reprogramar (opcional)</span><input name="localStart" type="datetime-local" /></label>
      <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Guardando…" : "Actualizar visita"}</button>
      {state.message ? <p aria-live="polite" className={`visit-feedback visit-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}

export function CancelOwnVisitButton({ visitId }: { visitId: string }) {
  const [state, setState] = useState(idle);
  const [pending, startTransition] = useTransition();
  function cancel() {
    const data = new FormData();
    data.set("visitId", visitId);
    startTransition(async () => setState(await cancelOwnVisitAction(state, data)));
  }
  return (
    <div className="visit-cancel-control">
      <button className="button button--secondary button--small" disabled={pending} onClick={cancel} type="button">{pending ? "Cancelando…" : "Cancelar visita"}</button>
      {state.message ? <p aria-live="polite" className={`visit-feedback visit-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </div>
  );
}
