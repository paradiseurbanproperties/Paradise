"use client";

import { useActionState } from "react";
import { addLeadNoteAction, updateLeadStageAction } from "@/features/crm/actions/lead-actions";
import { LEAD_STAGE_LABELS, LEAD_STAGES, type LeadStage } from "@/features/crm/types/lead";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialState: AuthActionState = { status: "idle", message: "" };

export function LeadStageControl({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const [state, formAction, pending] = useActionState(updateLeadStageAction, initialState);
  return (
    <form action={formAction} className="crm-stage-form">
      <input name="leadId" type="hidden" value={leadId} />
      <label>
        <span className="visually-hidden">Cambiar etapa</span>
        <select aria-label="Etapa del lead" defaultValue={stage} name="stage">
          {LEAD_STAGES.map((item) => <option key={item} value={item}>{LEAD_STAGE_LABELS[item]}</option>)}
        </select>
      </label>
      <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Guardando…" : "Actualizar"}</button>
      {state.message ? <span aria-live="polite" className={`crm-feedback crm-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
    </form>
  );
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(addLeadNoteAction, initialState);
  return (
    <form action={formAction} className="crm-note-form">
      <input name="leadId" type="hidden" value={leadId} />
      <label>
        <span>Nota interna</span>
        <textarea maxLength={2000} name="body" placeholder="Registra el seguimiento del equipo…" required rows={2} />
      </label>
      <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Guardando…" : "Agregar nota"}</button>
      {state.message ? <span aria-live="polite" className={`crm-feedback crm-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
    </form>
  );
}
